"""Internal API key check for service-to-service calls from apps/api.

See docs/09-contrato-ml-definitivo.md §2 — this is a second layer on top of the
real security perimeter (the private Docker network), not the main defense.
"""

import os

from fastapi import Header, HTTPException


def verify_internal_api_key(x_internal_api_key: str = Header(...)) -> None:
    expected = os.environ.get("INTERNAL_API_KEY", "")
    if not expected or x_internal_api_key != expected:
        raise HTTPException(status_code=401, detail="invalid_api_key")
