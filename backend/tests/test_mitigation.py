import numpy as np
from app.services.mitigation.prompt_neutralizer import prompt_neutralizer
from app.services.mitigation.counterfactual_augmenter import counterfactual_augmenter
from app.services.mitigation.representation_debiaser import representation_debiaser

def test_prompt_neutralization():
    text = "The chairman called his secretary to assist him."
    res = prompt_neutralizer.compare_prompts(text)
    assert "chairperson" in res["mitigated_prompt"].lower()
    assert "SYSTEM DIRECTIVE" in res["mitigated_prompt"]
    assert res["changes_detected"] is True

def test_counterfactual_augmentation_gender():
    text = "He is an ambitious engineer."
    res = counterfactual_augmenter.augment_text(text, category="gender")
    assert res["is_valid"] is True
    assert "she is an ambitious engineer." in res["counterfactuals"][0].lower()
    assert len(res["transformations_applied"]) > 0

def test_counterfactual_augmentation_no_demographic():
    text = "The table has four wooden legs."
    res = counterfactual_augmenter.augment_text(text, category="gender")
    assert res["is_valid"] is False
    assert res["rejection_reason"] is not None

def test_subspace_projection_neutralization():
    v1 = np.array([1.0, 2.0, 0.5])
    v2 = np.array([1.0, -1.0, 0.5])
    bias_subspace = representation_debiaser.identify_bias_subspace([(v1, v2)])
    assert bias_subspace.shape == (3,)

    # Neutralize vector
    v_target = np.array([0.5, 1.5, 0.2])
    v_debiased = representation_debiaser.neutralize_vector(v_target, bias_subspace)
    tradeoff = representation_debiaser.evaluate_projection_tradeoff(v_target, v_debiased)
    assert 0.0 <= tradeoff["utility_retention_pct"] <= 100.0
