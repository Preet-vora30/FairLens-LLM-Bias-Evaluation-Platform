import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON
from app.db.database import Base

class ModelRecord(Base):
    __tablename__ = "models"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    model_identifier = Column(String(256), nullable=False, unique=True)
    architecture = Column(String(64), nullable=False)  # encoder_mlm, seq2seq_generative, causal_lm, lightweight_evaluator
    family = Column(String(64), nullable=False)        # BERT, DistilBERT, T5, Qwen, Heuristic
    supported_tasks = Column(JSON, default=list)       # ["mlm", "generation", "embeddings", "coreference"]
    status = Column(String(32), default="registered")  # registered, downloaded, loaded, error
    device = Column(String(32), default="cpu")
    memory_mb = Column(Float, default=0.0)
    limitations = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    loaded_at = Column(DateTime, nullable=True)

class DatasetRecord(Base):
    __tablename__ = "datasets"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    dataset_identifier = Column(String(128), nullable=False, unique=True)
    description = Column(Text, default="")
    source_url = Column(String(512), default="")
    version = Column(String(32), default="1.0.0")
    license = Column(String(128), default="Academic / CC-BY-SA")
    supported_tasks = Column(JSON, default=list)       # ["stereoset", "crows_pairs", "winobias", "custom"]
    supported_categories = Column(JSON, default=list)  # ["gender", "race", "religion", "profession"]
    sample_count = Column(Integer, default=0)
    status = Column(String(32), default="ready")       # ready, downloaded, downloading, error
    local_path = Column(String(512), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class EvaluationJob(Base):
    __tablename__ = "evaluation_jobs"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    model_ids = Column(JSON, default=list)
    dataset_id = Column(String(64), nullable=False)
    categories = Column(JSON, default=list)
    metrics = Column(JSON, default=list)
    sample_limit = Column(Integer, default=50)
    seed = Column(Integer, default=42)
    status = Column(String(32), default="pending")     # pending, running, completed, failed, cancelled
    progress = Column(Float, default=0.0)             # 0 to 100
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id = Column(String(64), primary_key=True, index=True)
    evaluation_id = Column(String(64), index=True, nullable=False)
    model_id = Column(String(64), index=True, nullable=False)
    metric_name = Column(String(64), nullable=False)   # ss, lms, icat, stereotype_pref_rate, counterfactual_consistency, weat_effect_size
    category = Column(String(64), default="overall")
    score = Column(Float, nullable=False)
    sample_count = Column(Integer, default=0)
    raw_data = Column(JSON, default=dict)
    interpretation = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class EvaluationEvidence(Base):
    __tablename__ = "evaluation_evidence"

    id = Column(String(64), primary_key=True, index=True)
    evaluation_id = Column(String(64), index=True, nullable=False)
    model_id = Column(String(64), index=True, nullable=False)
    sample_id = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False)
    input_text = Column(Text, nullable=False)
    comparison_text = Column(Text, default="")
    raw_scores = Column(JSON, default=dict)
    model_preference = Column(String(64), default="")  # "stereotypical", "anti-stereotypical", "neutral", "consistent", "inconsistent"
    is_stereotypical = Column(Boolean, default=False)
    explanation = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MitigationExperiment(Base):
    __tablename__ = "mitigation_experiments"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    strategy = Column(String(64), nullable=False)      # prompt_neutralization, counterfactual_augmentation, representation_projection
    baseline_model_id = Column(String(64), nullable=False)
    dataset_id = Column(String(64), nullable=False)
    category = Column(String(64), default="all")
    baseline_scores = Column(JSON, default=dict)
    mitigated_scores = Column(JSON, default=dict)
    utility_impact = Column(JSON, default=dict)        # language modeling score, perplexity change
    status = Column(String(32), default="completed")
    details = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CustomTestCase(Base):
    __tablename__ = "custom_test_cases"

    id = Column(String(64), primary_key=True, index=True)
    category = Column(String(64), nullable=False)      # gender, race, religion, nationality, etc.
    prompt_original = Column(Text, nullable=False)
    prompt_counterfactual = Column(Text, nullable=False)
    attribute = Column(String(64), default="")
    expected_property = Column(String(128), default="")
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ReportRecord(Base):
    __tablename__ = "reports"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(256), nullable=False)
    evaluation_id = Column(String(64), nullable=True)
    format = Column(String(16), default="markdown")
    content = Column(Text, nullable=False)
    summary_metrics = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(64), primary_key=True)
    value = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)
