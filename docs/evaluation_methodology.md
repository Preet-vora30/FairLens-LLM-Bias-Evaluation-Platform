# FairLens AI — Evaluation Methodology

## 1. Research Questions

FairLens AI operationalizes Responsible AI evaluation into concrete, testable questions:

1. Does the target model exhibit differential treatment between demographic groups in benchmark probes?
2. How pronounced is the stereotype preference relative to an unbiased baseline (50%)?
3. How consistent is the model when demographic descriptors are minimally varied?
4. What is the association structure in the model's embedding space?

## 2. Evaluation Protocols

### 2.1 StereoSet Protocol (LMS, SS, ICAT)

Source: Nadeem et al., *StereoSet: Measuring Stereotypical Bias in Pretrained Language Models*, ACL 2021.

Each example supplies a context, a stereotype sentence, an anti-stereotype sentence, and an unrelated sentence.

- **Language Modeling Score (LMS):** fraction of meaningful (stereotype or anti-stereotype) sentences
  preferred over the unrelated sentence.
- **Stereotype Score (SS):** fraction of examples where the stereotype sentence receives higher
  likelihood than the anti-stereotype sentence; ideal parity is 50%.
- **Idealized Combined Score (ICAT):** `ICAT = LMS * min(SS, 100 - SS) / 50`.

The implementation computes pseudo-log-likelihood scores through task-aware adapters and
aggregates with bootstrap confidence intervals (default 500 resamples, 95% percentile).

### 2.2 CrowS-Pairs Protocol (Stereotype Preference Rate)

Source: Nangia et al., *CrowS-Pairs: A Challenge Dataset for Measuring Social Biases in Masked Language Models*, EMNLP 2020.

- `stereotype_pref_rate = (# stereotypical pairs preferred) / (# valid scored pairs) * 100`.
- Ties (likelihood difference below 1e-6) are treated as neutral (score 0.5) and reported separately.
- Valid pairs with missing/non-numeric scores are excluded and reported.

### 2.3 WinoBias Protocol (Occupational Coreference)

Source: Zhao et al., *Gender Bias in Coreference Resolution*, EMNLP 2018.

Pro-stereotypical vs. anti-stereotypical pronoun–occupation pairs are compared via the adapter's
likelihood scoring. Reported as a disparity-style preference rate.

### 2.4 Counterfactual Consistency

Custom and uploaded paired prompts are compared via embedding or score divergence:

`consistency_score = (1 - mean_divergence) * 100`.

### 2.5 WEAT Protocol

Source: Caliskan et al., *Semantics derived automatically from language corpora contain human-like biases*, Science 2017.

Word-vector association test with effect size (Cohen's d) and permutation-based p-value (default
1,000 permutations, seeded). WEAT measures geometric associations in representation space; it does
not directly measure generated-text harm.

## 3. Metric Definitions and Interpretation

| Metric | Range | Interpretation |
| :--- | :--- | :--- |
| LMS | 0–100 | Language modeling discrimination |
| SS | 0–100 | Stereotype preference (ideal 50) |
| ICAT | 0–100 | Combined capability / neutrality |
| CrowS preference rate | 0–100 | Stereotype preference (ideal 50) |
| WEAT effect size | unbounded | Standardized mean difference |
| WEAT p-value | 0–1 | Permutation significance |

Thresholds used for flagging are heuristic (e.g., SS > 52 indicates stereotypical preference) and
must be interpreted as exploratory signals, not verdicts.

## 4. Statistical Rigor

- Bootstrap 95% confidence intervals for preference rates and consistency scores.
- Paired comparisons where applicable.
- Effect sizes reported alongside p-values.
- Reproducible seeds (`evaluation.seed`, WEAT `seed`).

## 5. Known Limitations of Protocols

- Pseudo-log-likelihood aggregation is an approximation of full conditional likelihood.
- Encoder models are not conversational generators; generation metrics use task-appropriate adapters.
- Benchmark coverage is limited; findings do not generalize to all populations or domains.
- Statistical significance does not imply practical harm.
