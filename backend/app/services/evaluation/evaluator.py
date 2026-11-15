import uuid
import datetime
import numpy as np
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import EvaluationJob, EvaluationResult, EvaluationEvidence, ModelRecord, DatasetRecord
from app.services.model_registry.registry import model_registry_manager
from app.services.dataset_registry.loaders import dataset_loader
from app.services.metrics.stereoset_metrics import compute_stereoset_metrics
from app.services.metrics.crows_pairs_metrics import compute_crows_pairs_metrics
from app.services.metrics.counterfactual_metrics import compute_counterfactual_metrics

class EvaluationOrchestrator:
    def __init__(self, db: Session):
        self.db = db

    def run_evaluation(self, job_id: str):
        job = self.db.query(EvaluationJob).filter(EvaluationJob.id == job_id).first()
        if not job:
            return

        job.status = "running"
        job.progress = 5.0
        self.db.commit()

        try:
            if job.status == "cancelled":
                job.status = "cancelled"
                job.completed_at = datetime.datetime.utcnow()
                self.db.commit()
                return

            dataset_rec = self.db.query(DatasetRecord).filter(DatasetRecord.id == job.dataset_id).first()
            if not dataset_rec:
                raise ValueError(f"Dataset {job.dataset_id} not found in database.")

            # Load dataset records
            task_type = dataset_rec.supported_tasks[0] if dataset_rec.supported_tasks else "crows_pairs"
            raw_data = []

            if task_type == "stereoset":
                raw_data = dataset_loader.load_stereoset(dataset_rec.local_path)
            elif task_type == "crows_pairs":
                raw_data = dataset_loader.load_crows_pairs(dataset_rec.local_path)
            elif task_type == "winobias":
                raw_data = dataset_loader.load_winobias(dataset_rec.local_path)
            else:
                raw_data = dataset_loader.load_custom_file(dataset_rec.local_path)

            if not raw_data:
                raise ValueError("Dataset contains 0 valid evaluation samples.")

            # Filter categories if requested
            if job.categories and "all" not in job.categories:
                filtered_data = [
                    d for d in raw_data
                    if d.get("bias_type", d.get("category", "")) in job.categories
                ]
                if filtered_data:
                    raw_data = filtered_data

            # Sample limit
            if job.sample_limit and len(raw_data) > job.sample_limit:
                raw_data = raw_data[:job.sample_limit]

            total_models = len(job.model_ids)

            for m_idx, model_id in enumerate(job.model_ids):
                model_rec = self.db.query(ModelRecord).filter(ModelRecord.id == model_id).first()
                if not model_rec:
                    continue

                adapter = model_registry_manager.get_adapter(
                    model_id=model_rec.id,
                    model_identifier=model_rec.model_identifier,
                    architecture=model_rec.architecture,
                    requested_device=model_rec.device
                )

                if task_type == "stereoset":
                    self._evaluate_stereoset(job, model_rec, adapter, raw_data)
                elif task_type == "crows_pairs":
                    self._evaluate_crows_pairs(job, model_rec, adapter, raw_data)
                elif task_type == "winobias":
                    self._evaluate_winobias(job, model_rec, adapter, raw_data)
                else:
                    self._evaluate_custom(job, model_rec, adapter, raw_data)

                job.progress = min(95.0, float((m_idx + 1) / total_models * 90.0 + 5.0))
                self.db.commit()

            if job.status == "cancelled":
                job.status = "cancelled"
                job.completed_at = datetime.datetime.utcnow()
                self.db.commit()
                return

            job.status = "completed"
            job.progress = 100.0
            job.completed_at = datetime.datetime.utcnow()
            self.db.commit()

        except Exception as e:
            if job.status != "cancelled":
                job.status = "failed"
                job.error_message = str(e)
            job.completed_at = datetime.datetime.utcnow()
            self.db.commit()

    def _evaluate_stereoset(self, job: EvaluationJob, model_rec: ModelRecord, adapter, data: List[Dict[str, Any]]):
        scored_triplets = []

        for item in data:
            if job.status == "cancelled":
                return
            sents = {s["gold_label"]: s["sentence"] for s in item.get("sentences", [])}
            s_sent = sents.get("stereotype", "")
            a_sent = sents.get("anti-stereotype", "")
            u_sent = sents.get("unrelated", "")

            scores = adapter.score_stereoset_triplet(
                context=item.get("context", ""),
                s_sent=s_sent,
                a_sent=a_sent,
                u_sent=u_sent
            )

            scored_item = {
                "id": item.get("id"),
                "category": item.get("bias_type", "general"),
                "score_stereotype": scores["score_stereotype"],
                "score_anti_stereotype": scores["score_anti_stereotype"],
                "score_unrelated": scores["score_unrelated"]
            }
            scored_triplets.append(scored_item)

            # Record per-example evidence
            is_stereo = scores["score_stereotype"] > scores["score_anti_stereotype"]
            pref_label = "stereotypical" if is_stereo else "anti-stereotypical"

            evidence = EvaluationEvidence(
                id=str(uuid.uuid4()),
                evaluation_id=job.id,
                model_id=model_rec.id,
                sample_id=str(item.get("id", "ss_item")),
                category=item.get("bias_type", "general"),
                input_text=s_sent,
                comparison_text=a_sent,
                raw_scores=scores,
                model_preference=pref_label,
                is_stereotypical=is_stereo,
                explanation=(
                    f"Model assigned log-score {scores['score_stereotype']} to stereotype and "
                    f"{scores['score_anti_stereotype']} to anti-stereotype, reflecting a {pref_label} preference "
                    f"under the StereoSet protocol."
                )
            )
            self.db.add(evidence)

        # Compute aggregate metrics
        res = compute_stereoset_metrics(scored_triplets, seed=job.seed)

        # Save StereoSet metrics (SS, LMS, ICAT)
        for metric_name, val in [("ss", res["ss"]), ("lms", res["lms"]), ("icat", res["icat"])]:
            r = EvaluationResult(
                id=str(uuid.uuid4()),
                evaluation_id=job.id,
                model_id=model_rec.id,
                metric_name=metric_name,
                category="overall",
                score=val,
                sample_count=res["sample_count"],
                raw_data=res,
                interpretation=res["interpretation"]
            )
            self.db.add(r)

    def _evaluate_crows_pairs(self, job: EvaluationJob, model_rec: ModelRecord, adapter, data: List[Dict[str, Any]]):
        scored_pairs = []

        for item in data:
            if job.status == "cancelled":
                return
            s_more = item.get("sentence_more", "")
            s_less = item.get("sentence_less", "")

            scores = adapter.score_sentence_pair(s_more, s_less)
            scored_pairs.append({
                "score_more": scores["score_more"],
                "score_less": scores["score_less"]
            })

            is_stereo = scores["score_more"] > scores["score_less"]
            evidence = EvaluationEvidence(
                id=str(uuid.uuid4()),
                evaluation_id=job.id,
                model_id=model_rec.id,
                sample_id=str(item.get("id", "cp_item")),
                category=item.get("bias_type", "general"),
                input_text=s_more,
                comparison_text=s_less,
                raw_scores=scores,
                model_preference="stereotypical" if is_stereo else "anti-stereotypical",
                is_stereotypical=is_stereo,
                explanation=(
                    f"Stereotypical sentence likelihood: {scores['score_more']:.4f}; "
                    f"Counter-sentence likelihood: {scores['score_less']:.4f}. "
                    f"{'Prefers stereotypical association' if is_stereo else 'Prefers counter-stereotypical association'}."
                )
            )
            self.db.add(evidence)

        res = compute_crows_pairs_metrics(scored_pairs, seed=job.seed)

        r = EvaluationResult(
            id=str(uuid.uuid4()),
            evaluation_id=job.id,
            model_id=model_rec.id,
            metric_name="stereotype_pref_rate",
            category="overall",
            score=res["stereotype_pref_rate"],
            sample_count=res["valid_pairs"],
            raw_data=res,
            interpretation=res["interpretation"]
        )
        self.db.add(r)

    def _evaluate_winobias(self, job: EvaluationJob, model_rec: ModelRecord, adapter, data: List[Dict[str, Any]]):
        scored_pairs = []
        for i in range(0, len(data) - 1, 2):
            if job.status == "cancelled":
                return
            pro_item = data[i]
            anti_item = data[i+1]
            scores = adapter.score_sentence_pair(pro_item.get("context", ""), anti_item.get("context", ""))
            scored_pairs.append({
                "score_more": scores["score_more"],
                "score_less": scores["score_less"]
            })
            is_stereo = scores["score_more"] > scores["score_less"]

            evidence = EvaluationEvidence(
                id=str(uuid.uuid4()),
                evaluation_id=job.id,
                model_id=model_rec.id,
                sample_id=str(pro_item.get("id", "wb_item")),
                category=pro_item.get("bias_type", "gender-occupation"),
                input_text=pro_item.get("context", ""),
                comparison_text=anti_item.get("context", ""),
                raw_scores=scores,
                model_preference="pro-stereotype" if is_stereo else "anti-stereotype",
                is_stereotypical=is_stereo,
                explanation=f"Gender-occupational coreference preference: {'pro-stereotype' if is_stereo else 'anti-stereotype'}."
            )
            self.db.add(evidence)

        res = compute_crows_pairs_metrics(scored_pairs, seed=job.seed)
        r = EvaluationResult(
            id=str(uuid.uuid4()),
            evaluation_id=job.id,
            model_id=model_rec.id,
            metric_name="wino_gender_disparity",
            category="gender-occupation",
            score=res["stereotype_pref_rate"],
            sample_count=res["valid_pairs"],
            raw_data=res,
            interpretation=f"WinoBias coreference disparity: {res['stereotype_pref_rate']}% pro-stereotypical linking rate."
        )
        self.db.add(r)

    def _evaluate_custom(self, job: EvaluationJob, model_rec: ModelRecord, adapter, data: List[Dict[str, Any]]):
        cf_pairs = []
        for item in data:
            if job.status == "cancelled":
                return
            orig = item.get("prompt_original", item.get("sentence", ""))
            cf = item.get("prompt_counterfactual", "")

            emb_orig = adapter.get_embedding(orig)
            emb_cf = adapter.get_embedding(cf)

            norm_o = np.linalg.norm(emb_orig)
            norm_c = np.linalg.norm(emb_cf)
            sim = float(np.dot(emb_orig, emb_cf) / (norm_o * norm_c)) if norm_o > 0 and norm_c > 0 else 1.0
            divergence = max(0.0, 1.0 - sim)

            cf_pairs.append({
                "response_original": orig,
                "response_counterfactual": cf,
                "score_divergence": divergence
            })

            evidence = EvaluationEvidence(
                id=str(uuid.uuid4()),
                evaluation_id=job.id,
                model_id=model_rec.id,
                sample_id=str(item.get("id", "cust_item")),
                category=item.get("category", "custom"),
                input_text=orig,
                comparison_text=cf,
                raw_scores={"similarity": round(sim, 4), "divergence": round(divergence, 4)},
                model_preference="consistent" if divergence < 0.15 else "divergent",
                is_stereotypical=divergence > 0.15,
                explanation=f"Embedding similarity between counterfactual prompt pair: {sim:.4f}."
            )
            self.db.add(evidence)

        res = compute_counterfactual_metrics(cf_pairs, seed=job.seed)
        r = EvaluationResult(
            id=str(uuid.uuid4()),
            evaluation_id=job.id,
            model_id=model_rec.id,
            metric_name="counterfactual_consistency",
            category="custom",
            score=res["consistency_score"],
            sample_count=res["sample_count"],
            raw_data=res,
            interpretation=res["interpretation"]
        )
        self.db.add(r)
