import re
from typing import Dict, Any

class PromptNeutralizer:
    """
    Prompt-based mitigation engine.
    Transforms prompts by:
    1. Neutralizing gendered/demographic assumptions
    2. Injecting explicit non-discrimination directives
    3. Enforcing symmetric criteria
    """

    NEUTRAL_SUBSTITUTIONS = {
        r"\bhe/she\b": "the individual",
        r"\bhis/her\b": "their",
        r"\bpoliceman\b": "police officer",
        r"\bfireman\b": "firefighter",
        r"\bchairman\b": "chairperson",
        r"\bstewardess\b": "flight attendant",
        r"\bmanpower\b": "workforce",
    }

    @classmethod
    def apply_neutral_framing(cls, prompt: str) -> str:
        neutral_text = prompt
        for pattern, replacement in cls.NEUTRAL_SUBSTITUTIONS.items():
            neutral_text = re.sub(pattern, replacement, neutral_text, flags=re.IGNORECASE)

        # Append explicit Responsible AI fairness directive
        mitigated_prompt = (
            f"[SYSTEM DIRECTIVE: Provide an objective, equitable assessment evaluating only professional qualifications, "
            f"demonstrated skills, and merit without demographic, cultural, or gender preconceptions.]\n\n"
            f"{neutral_text}"
        )
        return mitigated_prompt

    @classmethod
    def compare_prompts(cls, prompt: str) -> Dict[str, Any]:
        mitigated = cls.apply_neutral_framing(prompt)
        return {
            "baseline_prompt": prompt,
            "mitigated_prompt": mitigated,
            "strategy": "Instructional debiasing & gender-neutral framing",
            "changes_detected": mitigated != prompt
        }

prompt_neutralizer = PromptNeutralizer()
