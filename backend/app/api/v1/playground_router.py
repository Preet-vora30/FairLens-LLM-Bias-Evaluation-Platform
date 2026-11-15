from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ModelRecord
from app.schemas.playground import PlaygroundGenerateRequest, PlaygroundGenerateResponse
from app.services.model_registry.registry import model_registry_manager
from app.services.mitigation.prompt_neutralizer import prompt_neutralizer
from app.services.mitigation.counterfactual_augmenter import counterfactual_augmenter
from app.services.metrics.generation_metrics import analyze_generated_text_fairness

router = APIRouter(prefix="/playground", tags=["Playground"])

@router.post("/generate", response_model=PlaygroundGenerateResponse)
def playground_generate(req: PlaygroundGenerateRequest, db: Session = Depends(get_db)):
    m = db.query(ModelRecord).filter(ModelRecord.id == req.model_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"Model {req.model_id} not found")

    adapter = model_registry_manager.get_adapter(
        model_id=m.id,
        model_identifier=m.model_identifier,
        architecture=m.architecture,
        requested_device=m.device
    )

    try:
        baseline_resp = adapter.generate(req.prompt, max_new_tokens=req.max_new_tokens, temperature=req.temperature)
    except NotImplementedError:
        baseline_resp = f"[{m.family} is an encoder MLM model. Encoder representations are optimized for masked scoring, not open-ended generation.]"

    neutral_prompt = None
    neutral_resp = None
    if req.apply_neutral_prompt:
        neutral_prompt = prompt_neutralizer.apply_neutral_framing(req.prompt)
        try:
            neutral_resp = adapter.generate(neutral_prompt, max_new_tokens=req.max_new_tokens, temperature=req.temperature)
        except NotImplementedError:
            neutral_resp = "[Encoder model: masked scoring only]"

    # Counterfactual prompt generation
    cf_data = counterfactual_augmenter.augment_text(req.prompt)
    cf_pairs = []
    for cf_p in cf_data.get("counterfactuals", []):
        try:
            cf_gen = adapter.generate(cf_p, max_new_tokens=req.max_new_tokens, temperature=req.temperature)
        except NotImplementedError:
            cf_gen = "[Encoder model: masked scoring only]"
        cf_pairs.append({
            "prompt": cf_p,
            "response": cf_gen
        })

    analysis = analyze_generated_text_fairness(baseline_resp)
    rationale = (
        f"Lexical analysis detected {analysis['positive_indicators']} positive competence markers and "
        f"{analysis['negative_indicators']} negative markers. "
        f"Neutral prompt framing was {'applied' if req.apply_neutral_prompt else 'omitted'}."
    )

    return PlaygroundGenerateResponse(
        model_id=m.id,
        baseline_prompt=req.prompt,
        baseline_response=baseline_resp,
        neutral_prompt=neutral_prompt,
        neutral_response=neutral_resp,
        counterfactual_pairs=cf_pairs,
        bias_rationale=rationale,
        generation_params={
            "max_new_tokens": req.max_new_tokens,
            "temperature": req.temperature,
            "top_p": req.top_p
        }
    )
