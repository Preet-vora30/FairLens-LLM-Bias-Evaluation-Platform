import numpy as np
from typing import List, Dict, Any, Tuple

class RepresentationDebiaser:
    """
    Subspace Projection Neutralization (Bolukbasi et al., 2016).
    Identifies the primary bias direction vector B and orthogonalizes embedding vectors:
    v_neutral = v - proj_B(v)
    """

    @staticmethod
    def identify_bias_subspace(defining_pairs: List[Tuple[np.ndarray, np.ndarray]]) -> np.ndarray:
        """
        Computes the primary direction of bias using the top singular vector
        of the difference vectors between demographic pairs.
        """
        diffs = []
        for v1, v2 in defining_pairs:
            diff = v1 - v2
            norm = np.linalg.norm(diff)
            if norm > 1e-7:
                diffs.append(diff / norm)

        if not diffs:
            # Fallback random unit vector
            v = np.ones(64, dtype=np.float32)
            return v / np.linalg.norm(v)

        matrix = np.array(diffs)
        # SVD
        _, _, vh = np.linalg.svd(matrix)
        bias_vector = vh[0]
        return bias_vector / np.linalg.norm(bias_vector)

    @classmethod
    def neutralize_vector(cls, v: np.ndarray, bias_vector: np.ndarray) -> np.ndarray:
        """
        Projects vector v to the orthogonal subspace of bias_vector.
        """
        norm_bias = np.linalg.norm(bias_vector)
        if norm_bias < 1e-7:
            return v

        unit_bias = bias_vector / norm_bias
        projection = np.dot(v, unit_bias) * unit_bias
        v_neutral = v - projection

        # Renormalize to original length
        original_norm = np.linalg.norm(v)
        neutral_norm = np.linalg.norm(v_neutral)
        if neutral_norm > 1e-7:
            v_neutral = v_neutral * (original_norm / neutral_norm)

        return v_neutral

    @classmethod
    def evaluate_projection_tradeoff(cls, v_orig: np.ndarray, v_debiased: np.ndarray) -> Dict[str, float]:
        norm_o = np.linalg.norm(v_orig)
        norm_d = np.linalg.norm(v_debiased)
        if norm_o == 0 or norm_d == 0:
            cos_sim = 1.0
        else:
            cos_sim = float(np.dot(v_orig, v_debiased) / (norm_o * norm_d))

        utility_retention = max(0.0, min(100.0, cos_sim * 100.0))
        return {
            "cosine_similarity": round(cos_sim, 4),
            "utility_retention_pct": round(utility_retention, 2),
            "distortion_l2": round(float(np.linalg.norm(v_orig - v_debiased)), 4)
        }

representation_debiaser = RepresentationDebiaser()
