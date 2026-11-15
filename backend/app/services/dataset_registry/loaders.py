import os
import json
import csv
from typing import List, Dict, Any
from app.core.config import settings

class DatasetLoader:
    @staticmethod
    def load_stereoset(file_path: str = None) -> List[Dict[str, Any]]:
        path = file_path or os.path.join(settings.BENCHMARKS_DIR, "stereoset.json")
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def load_crows_pairs(file_path: str = None) -> List[Dict[str, Any]]:
        path = file_path or os.path.join(settings.BENCHMARKS_DIR, "crows_pairs.json")
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def load_winobias(file_path: str = None) -> List[Dict[str, Any]]:
        path = file_path or os.path.join(settings.BENCHMARKS_DIR, "winobias.json")
        if not os.path.exists(path):
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def load_custom_file(file_path: str) -> List[Dict[str, Any]]:
        if not os.path.exists(file_path):
            return []

        if file_path.endswith(".json"):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else [data]
        elif file_path.endswith(".csv"):
            records = []
            with open(file_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    records.append(dict(row))
            return records
        return []

dataset_loader = DatasetLoader()
