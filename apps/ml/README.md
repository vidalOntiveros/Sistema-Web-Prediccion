# apps/ml — Servicio de predicción (FastAPI)

Mock del servicio de ML. Contrato definitivo: [docs/09-contrato-ml-definitivo.md](../../docs/09-contrato-ml-definitivo.md).

## Desarrollo nativo

```bash
py -3.11 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
$env:INTERNAL_API_KEY = "changeme"
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

Swagger: http://localhost:8000/docs

## Tests

```bash
.venv\Scripts\pytest -v
```
