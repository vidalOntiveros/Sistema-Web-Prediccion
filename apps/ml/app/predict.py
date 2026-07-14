"""Mock prediction logic.

Deterministic, not random: a student with a worse profile always scores higher,
so a demo looks coherent even though there is no real model yet. See
docs/09-contrato-ml-definitivo.md §5. This whole module is what gets replaced
once the real model exists — the contract in models.py does not change.
"""

from app.models import PredictionResponse, TopFactor

MODEL_VERSION = "mock-v0"

REFERENCE_FEATURES = ("promedio_general", "materias_reprobadas", "adeudos")

_NEUTRAL_DEFAULTS = {
    "promedio_general": 7.0,
    "materias_reprobadas": 0.0,
    "adeudos": 0.0,
}


class InsufficientDataError(Exception):
    def __init__(self, missing_features: list[str]):
        self.missing_features = missing_features
        super().__init__("insufficient data to run a prediction")


def _as_float(value: object, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def run_mock_prediction(features: dict[str, object]) -> PredictionResponse:
    known_present = [key for key in REFERENCE_FEATURES if features.get(key) is not None]
    if not known_present:
        raise InsufficientDataError(missing_features=list(REFERENCE_FEATURES))

    promedio_general = _as_float(
        features.get("promedio_general"), _NEUTRAL_DEFAULTS["promedio_general"]
    )
    materias_reprobadas = _as_float(
        features.get("materias_reprobadas"), _NEUTRAL_DEFAULTS["materias_reprobadas"]
    )
    adeudos = _as_float(features.get("adeudos"), _NEUTRAL_DEFAULTS["adeudos"])

    contributions = {
        "promedio_general": -0.05 * (promedio_general - 7.0),
        "materias_reprobadas": 0.08 * materias_reprobadas,
        "adeudos": 0.03 * adeudos,
    }

    score = 0.5 + sum(contributions.values())
    score = max(0.02, min(0.98, score))

    total_weight = sum(abs(value) for value in contributions.values())
    top_factors = [
        TopFactor(
            feature=feature,
            contribution=(
                round(abs(value) / total_weight, 4) if total_weight > 0 else 0.0
            ),
        )
        for feature, value in sorted(
            contributions.items(), key=lambda item: abs(item[1]), reverse=True
        )
    ]

    return PredictionResponse(
        modelVersion=MODEL_VERSION,
        score=round(score, 4),
        riskLevel=None,  # apps/api calcula riskLevel desde score (ver ADR-0001)
        topFactors=top_factors,
    )
