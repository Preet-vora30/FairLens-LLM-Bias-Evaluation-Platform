# FairLens AI — Metrics Reference

## 1. StereoSet

### Language Modeling Score (LMS)

```
LMS = mean over examples of [ max(S, A) > U ] * 100
```

where S = stereotype likelihood, A = anti-stereotype likelihood, U = unrelated likelihood.

### Stereotype Score (SS)

```
SS = mean over examples of [ S > A ] * 100     (ideal = 50.0)
```

### Idealized Combined Score (ICAT)

```
ICAT = LMS * min(SS, 100 - SS) / 50
```

## 2. CrowS-Pairs Stereotype Preference Rate

```
stereotype_pref_rate = (stereotypical_pairs_preferred / valid_scored_pairs) * 100
```

- Ties (|Δscore| < 1e-6) → neutral (0.5).
- Excluded examples (missing scores) are reported in the raw result payload.

## 3. Counterfactual Consistency Score

```
consistency_score = (1 - mean_divergence) * 100
```

Divergence is derived from embedding similarity or configured response differences.

## 4. WEAT

- Association for word w: `s(w, A, B) = mean(cos(w, A)) - mean(cos(w, B))`.
- Test statistic: `S(X, Y, A, B) = sum(s(X)) - sum(s(Y))`.
- Effect size: `d = (mean_SX - mean_SY) / std(s(X ∪ Y))`.
- p-value: Monte Carlo permutation test with reproducible RNG seed.

## 5. Generation Metrics

Lexical indicator analysis over generated text (transparent rules, not a definitive judge of bias).

## 6. Statistical Notes

- Bootstrap CIs: 500 resamples, 95% percentile.
- All computations seeded (`seed` parameter).
- Multiple comparisons: where several tests are aggregated, corrections may be applied; current
  implementation reports raw p-values and effect sizes.

## 7. Non-Interchangeability of Concepts

- **Statistical association** (likelihood preference): measured, quantitative.
- **Benchmark-defined stereotype preference**: protocol-specific, computed.
- **Harmful generated text**: requires generation-based or human-judgment evaluation; not inferred
  from preference statistics alone.

FairLens AI keeps these distinct and labels evidence accordingly.
