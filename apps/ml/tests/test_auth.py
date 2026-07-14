def test_predict_without_api_key_is_rejected(client):
    response = client.post(
        "/predict",
        json={"studentId": "s1", "contractVersion": "1", "features": {}},
    )
    assert response.status_code in (
        401,
        422,
    )  # 422 si FastAPI exige el header antes de validar body


def test_predict_with_wrong_api_key_is_rejected(client):
    response = client.post(
        "/predict",
        json={
            "studentId": "s1",
            "contractVersion": "1",
            "features": {"promedio_general": 8},
        },
        headers={"X-Internal-Api-Key": "wrong-key"},
    )
    assert response.status_code == 401
