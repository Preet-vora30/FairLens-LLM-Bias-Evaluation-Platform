import os
from typing import Dict, Optional, Any
from app.services.model_registry.adapters import (
    BaseModelAdapter,
    MaskedLMAdapter,
    Seq2SeqGenerativeAdapter,
    FastDeterministicEvaluatorAdapter
)

try:
    import torch
except Exception:
    torch = None

class ModelRegistryManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelRegistryManager, cls).__new__(cls)
            cls._instance._loaded_adapters: Dict[str, BaseModelAdapter] = {}
        return cls._instance

    def detect_device(self, requested_device: Optional[str] = None) -> str:
        cuda_available = bool(torch is not None and torch.cuda.is_available())
        if requested_device and requested_device.lower() in ["cuda", "gpu"]:
            return "cuda" if cuda_available else "cpu"
        if requested_device and requested_device.lower() == "cpu":
            return "cpu"
        return "cuda" if cuda_available else "cpu"

    def get_adapter(self, model_id: str, model_identifier: str, architecture: str, requested_device: str = "cpu") -> BaseModelAdapter:
        if model_id in self._loaded_adapters:
            return self._loaded_adapters[model_id]

        device = self.detect_device(requested_device)

        if "heuristic" in model_identifier or "fast-heuristic" in model_id:
            adapter = FastDeterministicEvaluatorAdapter(model_identifier, device=device)
        elif architecture == "encoder_mlm":
            adapter = MaskedLMAdapter(model_identifier, device=device)
        elif architecture == "seq2seq_generative":
            adapter = Seq2SeqGenerativeAdapter(model_identifier, device=device)
        else:
            # Default to FastDeterministic if unknown or fallback
            adapter = FastDeterministicEvaluatorAdapter(model_identifier, device=device)

        adapter.load()
        self._loaded_adapters[model_id] = adapter
        return adapter

    def unload_adapter(self, model_id: str):
        if model_id in self._loaded_adapters:
            adapter = self._loaded_adapters.pop(model_id)
            adapter.unload()

    def is_loaded(self, model_id: str) -> bool:
        return model_id in self._loaded_adapters

    def get_loaded_models_count(self) -> int:
        return len(self._loaded_adapters)

model_registry_manager = ModelRegistryManager()
