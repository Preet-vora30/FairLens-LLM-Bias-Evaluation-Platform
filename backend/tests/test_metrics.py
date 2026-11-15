import pytest
import numpy as np
from app.services.metrics.stereoset_metrics import compute_stereoset_metrics
from app.services.metrics.crows_pairs_metrics import compute_crows_pairs_metrics
from app.services.metrics.counterfactual_metrics import compute_counterfactual_metrics
from app.services.metrics.weat_metrics import compute_weat_score
from app.services.metrics.generation_metrics import analyze_generated_text_fairness

def test_stereoset_metrics_ideal():
    # 2 examples: one prefers stereotype, one prefers anti-stereotype (SS should be 50%)
    examples = [
        {"score_stereotype": -1.0, "score_anti_stereotype": -2.0, "score_unrelated": -5.0},
        {"score_stereotype": -2.0, "score_anti_stereotype": -1.0, "score_unrelated": -5.0}
    ]
    res = compute_stereoset_metrics(examples)
    assert res["lms"] == 100.0
    assert res["ss"] == 50.0
    assert res["icat"] == 100.0
    assert res["sample_count"] == 2

def test_stereoset_metrics_biased():
    # Both prefer stereotype
    examples = [
        {"score_stereotype": -0.5, "score_anti_stereotype": -2.0, "score_unrelated": -5.0},
        {"score_stereotype": -0.8, "score_anti_stereotype": -2.5, "score_unrelated": -5.0}
    ]
    res = compute_stereoset_metrics(examples)
    assert res["lms"] == 100.0
    assert res["ss"] == 100.0
    # If SS is 100%, min(100, 0) / 50 = 0 -> ICAT should be 0.0
    assert res["icat"] == 0.0

def test_crows_pairs_metrics():
    # 4 pairs: 3 stereo preferred, 1 anti-stereo preferred
    examples = [
        {"score_more": -1.0, "score_less": -2.0},
        {"score_more": -1.2, "score_less": -2.1},
        {"score_more": -0.5, "score_less": -1.8},
        {"score_more": -2.0, "score_less": -1.0}
    ]
    res = compute_crows_pairs_metrics(examples)
    assert res["valid_pairs"] == 4
    assert res["stereo_preferred"] == 3
    assert res["antistereo_preferred"] == 1
    assert res["stereotype_pref_rate"] == 75.0

def test_crows_pairs_with_ties():
    examples = [
        {"score_more": -1.0, "score_less": -1.0}, # tie
        {"score_more": -1.0, "score_less": -2.0}  # stereo
    ]
    res = compute_crows_pairs_metrics(examples)
    assert res["valid_pairs"] == 2
    assert res["ties"] == 1
    assert res["stereo_preferred"] == 1
    assert res["stereotype_pref_rate"] == 75.0 # (1.0 + 0.5) / 2 = 75%

def test_counterfactual_metrics():
    pairs = [
        {"response_original": "She is a skilled surgeon", "response_counterfactual": "She is a skilled surgeon", "score_divergence": 0.0},
        {"response_original": "He is a doctor", "response_counterfactual": "She is a nurse", "score_divergence": 0.6}
    ]
    res = compute_counterfactual_metrics(pairs)
    assert res["sample_count"] == 2
    assert res["exact_matches"] == 1
    assert res["divergence_mean"] == 0.3
    assert res["consistency_score"] == 70.0

def test_weat_score():
    # 2 target vectors, 2 attribute vectors with distinct associations
    X = [np.array([1.0, 0.0]), np.array([0.9, 0.1])]
    Y = [np.array([0.0, 1.0]), np.array([0.1, 0.9])]
    A = [np.array([1.0, 0.0]), np.array([0.8, 0.2])]
    B = [np.array([0.0, 1.0]), np.array([0.2, 0.8])]

    res = compute_weat_score(X, Y, A, B, n_permutations=200)
    assert res["effect_size"] > 0
    assert 0.0 <= res["p_value"] <= 1.0
    assert res["sample_counts"]["X"] == 2

def test_analyze_generated_text():
    text = "The doctor was brilliant, capable, and dedicated."
    res = analyze_generated_text_fairness(text)
    assert res["positive_indicators"] >= 3
    assert res["negative_indicators"] == 0
    assert not res["potential_risk_flag"]
