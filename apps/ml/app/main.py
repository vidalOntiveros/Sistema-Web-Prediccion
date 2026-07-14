from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse

from app.auth import verify_internal_api_key
from app.models import PredictionErrorResponse, PredictionRequest, PredictionResponse
from app.predict import InsufficientDataError, run_mock_prediction

app = FastAPI(title="Servicio de Predicción (ML)", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/predict",
    response_model=PredictionResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def predict(request: PredictionRequest) -> PredictionResponse | JSONResponse:
    try:
        return run_mock_prediction(request.features)
    except InsufficientDataError as exc:
        return JSONResponse(
            status_code=422,
            content=PredictionErrorResponse(
                error="INSUFFICIENT_DATA",
                message="No hay suficientes datos del estudiante para generar una predicción.",
                missingFeatures=exc.missing_features,
            ).model_dump(),
        )
