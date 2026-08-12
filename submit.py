"""Safe state-dict submission client for the SummerML evaluator."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

import requests
import torch

DEFAULT_URL_BROKER = "https://tues-ai.github.io/SummerML/server-url/current.txt"
CHALLENGES = (
    "lenet5-mnist",
    "resnet1d-forda",
    "mlp-higgs",
    "lstm-sequential-mnist",
    "nin-cifar100",
    "alexnet-tiny-imagenet",
    "lstm-ptb",
)
MAX_FILE_BYTES = 100 * 1024 * 1024
EXPECTED_ARCHITECTURES = {
    "lenet5-mnist": "lenet5",
    "resnet1d-forda": "resnet1d-wang",
    "mlp-higgs": "mlp",
    "lstm-sequential-mnist": "lstm",
    "nin-cifar100": "nin",
    "alexnet-tiny-imagenet": "scaled-alexnet",
    "lstm-ptb": "zaremba-small",
}


def load_checkpoint(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise FileNotFoundError(f"checkpoint not found: {path}")
    if path.stat().st_size > MAX_FILE_BYTES:
        raise ValueError("checkpoint exceeds the 100 MiB submission limit")

    checkpoint = torch.load(path, map_location="cpu", weights_only=True)

    if not isinstance(checkpoint, dict):
        raise ValueError("checkpoint must be a dictionary, not a pickled model")
    state_dict = checkpoint.get("model_state_dict")
    config = checkpoint.get("config")
    if not isinstance(state_dict, dict) or not state_dict:
        raise ValueError("checkpoint must contain a non-empty model_state_dict")
    if not all(isinstance(key, str) and torch.is_tensor(value) for key, value in state_dict.items()):
        raise ValueError("model_state_dict may contain only string keys and tensors")
    if not isinstance(config, dict) or not isinstance(config.get("architecture"), str):
        raise ValueError("checkpoint config must contain an architecture string")
    return checkpoint


def resolve_server_url(direct_url: str, broker_url: str) -> str:
    if direct_url:
        return direct_url.rstrip("/")
    response = requests.get(broker_url, timeout=15)
    response.raise_for_status()
    server_url = response.text.strip().rstrip("/")
    if not server_url:
        raise RuntimeError("the evaluator is sleeping; try again when your teacher starts it")
    return server_url


def score_text(score: dict[str, Any]) -> str:
    metric = score.get("metric")
    value = score.get("value")
    if metric == "perplexity":
        return f"perplexity={value:.3f}"
    if metric == "roc_auc":
        return f"ROC-AUC={value:.5f}"
    if metric == "accuracy":
        return f"accuracy={value * 100:.2f}%"
    return str(score)


def main() -> None:
    parser = argparse.ArgumentParser(description="Submit a safe state-dict checkpoint to SummerML")
    parser.add_argument("--challenge", required=True, choices=CHALLENGES)
    parser.add_argument("--name", required=True, help="leaderboard name used for progress and unlocking")
    parser.add_argument("--file", default="submission.pt", help="state-dict checkpoint path")
    parser.add_argument("--score-only", action="store_true", help="evaluate without publishing")
    parser.add_argument("--server-url", default="", help="direct evaluator URL for local testing")
    parser.add_argument("--url-broker", default=DEFAULT_URL_BROKER)
    args = parser.parse_args()

    name = args.name.strip()
    if not name:
        parser.error("--name cannot be empty")

    path = Path(args.file)
    checkpoint = load_checkpoint(path)
    architecture = checkpoint["config"]["architecture"]
    expected = EXPECTED_ARCHITECTURES[args.challenge]
    if checkpoint["config"].get("challenge_id") != args.challenge:
        raise ValueError("checkpoint config.challenge_id must match --challenge")
    if architecture != expected:
        raise ValueError(
            f"challenge {args.challenge!r} expects architecture={expected!r}, got {architecture!r}"
        )
    print(f"Validated safe checkpoint: architecture={architecture!r}, size={path.stat().st_size / 1024**2:.1f} MiB")

    server_url = resolve_server_url(args.server_url, args.url_broker)
    route = "score" if args.score_only else "submit"
    with path.open("rb") as model_file:
        response = requests.post(
            f"{server_url}/api/{route}/{args.challenge}",
            data={"name": name},
            files={"model_file": (path.name, model_file, "application/octet-stream")},
            timeout=600,
        )

    if not response.ok:
        print(response.text)
    response.raise_for_status()
    payload = response.json()
    print(f"{args.challenge}: {score_text(payload['score'])}")
    print("Scored without publishing." if args.score_only else "Published to the leaderboard.")
    if payload.get("score", {}).get("passed") is not None:
        print("Pass threshold:", "met" if payload["score"]["passed"] else "not met yet")


if __name__ == "__main__":
    main()
