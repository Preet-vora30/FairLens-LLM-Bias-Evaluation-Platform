# FairLens AI — Experiment Records

This directory stores reproducible experiment configurations, manifests, and notes for bias and
fairness evaluations.

## Layout

```
experiments/
├── README.md
└── configs/
    └── baseline_stereoset_audit.yaml
```

## Protocol

Each experiment should record: research question, hypothesis, model, dataset version, evaluation
protocol, categories, metrics, sample limits, seeds, generation settings, and software versions.

Machine-readable JSON manifests can be exported via the backend experiment/report APIs.
