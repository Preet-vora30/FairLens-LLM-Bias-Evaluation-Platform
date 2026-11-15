# FairLens AI Benchmarks & Datasets

This directory manages benchmark datasets used for evaluating language models on social, demographic, and occupational bias.

## Included Benchmarks

### 1. StereoSet (Nadeem et al., 2021)
- **Paper**: *StereoSet: Measuring stereotypical bias in pretrained language models* (ACL 2021)
- **Task**: Masked token / target sentence evaluation measuring:
  - **LMS (Language Modeling Score)**: Percentage of instances where the model prefers meaningful context over unrelated tokens.
  - **SS (Stereotype Score)**: Percentage of instances where the model prefers stereotypical over anti-stereotypical associations (ideal = 50.0%).
  - **ICAT (Idealized Cat Score)**: Composite score balancing language modeling capability and stereotype neutrality:
    $$\text{ICAT} = \text{LMS} \times \frac{\min(\text{SS}, 100 - \text{SS})}{50}$$
- **Categories**: Gender, Race/Ethnicity, Religion, Profession.

### 2. CrowS-Pairs (Nangia et al., 2020)
- **Paper**: *CrowS-Pairs: A Challenge Dataset for Measuring Social Biases in Masked Language Models* (EMNLP 2020)
- **Task**: Minimal sentence pairs where one sentence demonstrates a stereotype and the counter-sentence violates it.
- **Metric**: Stereotype Preference Rate (% of pairs where stereotypical sentence has higher pseudo-log-likelihood or token perplexity).
- **Categories**: Gender, Race/Color, Religion, Nationality, Socioeconomic, Age, Disability.

### 3. WinoBias (Zhao et al., 2018)
- **Paper**: *Gender Bias in Coreference Resolution: Evaluation and Debiasing Methods* (EMNLP 2018)
- **Task**: Pro-stereotypical vs Anti-stereotypical coreference pairs linking occupational roles with gender pronouns.
- **Metric**: Disparity / Error differential between pro-stereotyped and anti-stereotyped instances.

### 4. Custom Benchmark Datasets
- Evaluates user-uploaded CSV / JSON files with schema validation, counterfactual pairing, and metric generation.
