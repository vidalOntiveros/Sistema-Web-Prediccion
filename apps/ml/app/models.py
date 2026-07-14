"""Pydantic schemas for the /predict contract.

See docs/09-contrato-ml-definitivo.md for the frozen specification.
"""

from pydantic import BaseModel

FeatureValue = str | float | bool | None


class PredictionRequest(BaseModel):
    studentId: str
    contractVersion: str
    features: dict[str, FeatureValue]


class TopFactor(BaseModel):
    feature: str
    contribution: float


class PredictionResponse(BaseModel):
    modelVersion: str
    score: float
    riskLevel: str | None = None
    topFactors: list[TopFactor] = []


class PredictionErrorResponse(BaseModel):
    error: str
    message: str
    missingFeatures: list[str] = []
