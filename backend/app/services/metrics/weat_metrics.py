import numpy as np
from typing import List, Dict, Any

def _cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))

def compute_weat_score(
    X: List[np.ndarray],  # Target set 1 (e.g. math terms)
    Y: List[np.ndarray],  # Target set 2 (e.g. arts terms)
    A: List[np.ndarray],  # Attribute set 1 (e.g. male names)
    B: List[np.ndarray],  # Attribute set 2 (e.g. female names)
    n_permutations: int = 1000,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Computes WEAT (Word Embedding Association Test) effect size and permutation p-value:
    - s(w, A, B) = mean_a cos(w, a) - mean_b cos(w, b)
    - S(X, Y, A, B) = sum_x s(x, A, B) - sum_y s(y, A, B)
    - Effect size d = (mean_{x in X} s(x, A, B) - mean_{y in Y} s(y, A, B)) / std_{w in X U Y} s(w, A, B)
    - p-value: Monte Carlo permutation test of partitioned (X U Y)
    """
    if not X or not Y or not A or not B:
        return {
            "effect_size": 0.0,
            "p_value": 1.0,
            "s_statistic": 0.0,
            "sample_counts": {"X": len(X), "Y": len(Y), "A": len(A), "B": len(B)},
            "interpretation": "Insufficient embedding vectors for WEAT test."
        }

    # Helper function for association score s(w, A, B)
    def assoc_score(w: np.ndarray) -> float:
        sim_A = [float(_cosine_similarity(w, a)) for a in A]
        sim_B = [float(_cosine_similarity(w, b)) for b in B]
        return float(np.mean(sim_A) - np.mean(sim_B))

    s_X = [assoc_score(x) for x in X]
    s_Y = [assoc_score(y) for y in Y]
    s_total = s_X + s_Y

    mean_s_X = float(np.mean(s_X))
    mean_s_Y = float(np.mean(s_Y))
    std_s_total = float(np.std(s_total, ddof=1)) if len(s_total) > 1 else 1e-6

    if std_s_total < 1e-9:
        std_s_total = 1e-6

    effect_size = float((mean_s_X - mean_s_Y) / std_s_total)
    s_statistic = float(np.sum(s_X) - np.sum(s_Y))

    # Permutation test
    rng = np.random.default_rng(seed)
    len_X = len(X)
    s_arr = np.array(s_total)

    perm_count = 0
    for _ in range(n_permutations):
        perm_idx = rng.permutation(len(s_arr))
        perm_s_X = s_arr[perm_idx[:len_X]]
        perm_s_Y = s_arr[perm_idx[len_X:]]
        perm_s_stat = np.sum(perm_s_X) - np.sum(perm_s_Y)
        if perm_s_stat >= s_statistic:
            perm_count += 1

    p_value = float(perm_count / n_permutations)

    significance = (
        "statistically significant (p < 0.05)" if p_value < 0.05
        else "not statistically significant (p >= 0.05)"
    )
    interpretation = (
        f"WEAT effect size d = {effect_size:.3f} with permutation p-value = {p_value:.4f} ({significance}). "
        f"Note: WEAT measures geometric associations in representation space, not direct behavioral output harm."
    )

    return {
        "effect_size": round(effect_size, 4),
        "p_value": round(p_value, 4),
        "s_statistic": round(s_statistic, 4),
        "sample_counts": {"X": len(X), "Y": len(Y), "A": len(A), "B": len(B)},
        "interpretation": interpretation
    }
