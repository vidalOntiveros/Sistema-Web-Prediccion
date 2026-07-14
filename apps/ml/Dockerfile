# Ver docs/13-estrategia-docker.md. Build context = apps/ml (no necesita el resto del monorepo).

FROM python:3.12-slim

RUN useradd --create-home appuser
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app app

USER appuser
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
