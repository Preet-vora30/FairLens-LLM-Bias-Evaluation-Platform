import re
from typing import List, Dict, Any

class CounterfactualAugmenter:
    """
    Counterfactual Data Augmentation (CDA) Pipeline.
    Generates minimally perturbed demographic pairs using single-pass token substitution
    to prevent bidirectional flipping loops.
    """

    GENDER_MAP = {
        "he": "she", "she": "he",
        "him": "her", "her": "him",
        "his": "her", "hers": "his",
        "man": "woman", "woman": "man",
        "men": "women", "women": "men",
        "father": "mother", "mother": "father",
        "son": "daughter", "daughter": "son",
        "boy": "girl", "girl": "boy",
        "male": "female", "female": "male",
        "brother": "sister", "sister": "brother"
    }

    RELIGION_MAP = {
        "christian": "muslim", "muslim": "christian",
        "jewish": "buddhist", "buddhist": "jewish",
        "hindu": "sikh", "sikh": "hindu"
    }

    RACE_MAP = {
        "black": "white", "white": "black",
        "asian": "hispanic", "hispanic": "asian",
        "european": "african", "african": "european"
    }

    @classmethod
    def augment_text(cls, text: str, category: str = "gender") -> Dict[str, Any]:
        mapping = cls.GENDER_MAP
        if category == "religion":
            mapping = cls.RELIGION_MAP
        elif category in ["race", "race-color", "race-ethnicity"]:
            mapping = cls.RACE_MAP

        # Single-pass regex with all keys
        pattern = re.compile(r'\b(' + '|'.join(re.escape(k) for k in mapping.keys()) + r')\b', re.IGNORECASE)
        applied_rules = []

        def replace_fn(match):
            word = match.group(0)
            target = mapping.get(word.lower(), word)
            applied_rules.append(f"{word} -> {target}")
            if word.isupper():
                return target.upper()
            elif word[0].isupper():
                return target.capitalize()
            return target

        transformed = pattern.sub(replace_fn, text)
        is_valid = transformed != text
        counterfactuals = [transformed] if is_valid else []

        return {
            "original": text,
            "counterfactuals": counterfactuals,
            "transformations_applied": applied_rules,
            "is_valid": is_valid,
            "rejection_reason": None if is_valid else "No applicable demographic keywords found to perturb."
        }

    @classmethod
    def augment_dataset(cls, dataset: List[Dict[str, Any]], category: str = "gender") -> List[Dict[str, Any]]:
        augmented_records = []
        seen = set()

        for item in dataset:
            text = item.get("sentence", item.get("context", item.get("input_text", "")))
            if not text or text in seen:
                continue
            seen.add(text)
            augmented_records.append(item)

            res = cls.augment_text(text, category=category)
            if res["is_valid"]:
                cf_text = res["counterfactuals"][0]
                if cf_text not in seen:
                    seen.add(cf_text)
                    cf_item = dict(item)
                    cf_item["id"] = f"{item.get('id', 'item')}_cda"
                    if "sentence" in cf_item:
                        cf_item["sentence"] = cf_text
                    if "context" in cf_item:
                        cf_item["context"] = cf_text
                    cf_item["is_augmented"] = True
                    augmented_records.append(cf_item)

        return augmented_records

counterfactual_augmenter = CounterfactualAugmenter()
