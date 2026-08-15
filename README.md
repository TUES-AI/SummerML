# SummerML

Seven paper-reproduction challenges for TUES machine-learning students. The public site is designed for GitHub Pages with no build step:

https://tues-ai.github.io/SummerML/

The papers are the specification. Each challenge provides only a concise dataset wrapper, architectural constraints, and a safe checkpoint submission path. Datasets, trained weights, evaluator data, and model solutions are intentionally not bundled.

## Progression

| Level | Challenge | Modality | Advancement |
|---|---|---|---|
| 1 | [LeNet-5 on MNIST](level1/LeNet5/) | Image | Pass any 2 of Level 1 |
| 1 | [1D ResNet on FordA](level1/1DResNet/) | Sensor sequence | Pass any 2 of Level 1 |
| 1 | [MLP on HIGGS](level1/HIGGS-MLP/) | Tabular | Pass any 2 of Level 1 |
| 2 | [LSTM on sequential MNIST](level2/Sequential-MNIST/) | Long sequence | Pass either Level 2 challenge |
| 2 | [Network in Network on CIFAR-100](level2/Network-in-Network/) | Image | Pass either Level 2 challenge |
| 3 | [Scaled AlexNet on Tiny ImageNet](level3/Scaled-AlexNet/) | Image | Final level |
| 3 | [Full BERT Mini fine-tuning on SST-2](level3/BERT-Mini-SST2/) | Language | Final level |

A challenge is passed only when the private evaluator reports that its pass reference has been met. Published paper metrics are historical context; paper reproduction, pass, and strong-reference rows on the site are produced by the same private evaluation protocol.

## Install

```bash
python -m pip install -r requirements.txt
```

Every dataset example on the site wraps the source in a custom `torch.utils.data.Dataset`. Training and architecture code are student work.

## Safe checkpoint format

Submit state dictionaries, never complete pickled model objects:

```python
import torch

torch.save(
    {
        "model_state_dict": model.state_dict(),
        "config": {"challenge_id": "lenet5-mnist", "architecture": "lenet5", "activation": "tanh"},
    },
    "submission.pt",
)
```

The evaluator reconstructs a permitted architecture from `config`, checks tensor count, registration order, shapes, and dtypes, then runs only its private model code. Your module names may differ, but register layers in paper order. Submitted Python is never executed.

## Submit

Publish a score:

```bash
python submit.py --challenge lenet5-mnist --name "your-name"
```

Evaluate without publishing:

```bash
python submit.py --challenge lenet5-mnist --name "your-name" --score-only
```

For a local evaluator:

```bash
python submit.py --challenge lenet5-mnist --name "your-name" --server-url http://127.0.0.1:5000
```

Use the same leaderboard name for every challenge so unlock progress can be calculated.

## Public/private architecture

This repository contains the static frontend, seven standalone challenge pages, and submission client. The adjacent private `TUES-AI/SummerML-Leaderboard-Server` repository owns datasets, hidden transformations, architecture reconstruction, scoring, progress, and saved records.

The frontend reads the live evaluator URL from `server-url/current.txt`, then requests:

```text
GET  /api/state?name=<leaderboard-name>
POST /api/score/<challenge-id>   fields: name, model_file
POST /api/submit/<challenge-id>  fields: name, model_file
```

`GET /api/state` returns challenge leaderboards/reference values and name-based progress. An empty `server-url/current.txt` is the normal sleeping state; the site remains fully readable.

## GitHub Pages

Serve the repository root from the `main` branch. All frontend assets and broker requests use relative paths, so the site works under `/SummerML/`.
