from app.predict import InsufficientDataError, run_mock_prediction


def test_worse_profile_scores_higher():
    good_student = run_mock_prediction(
        {"promedio_general": 9.0, "materias_reprobadas": 0, "adeudos": 0}
    )
    bad_student = run_mock_prediction(
        {"promedio_general": 6.0, "materias_reprobadas": 3, "adeudos": 2}
    )
    assert bad_student.score > good_student.score


def test_same_input_gives_same_score():
    features = {"promedio_general": 7.5, "materias_reprobadas": 1, "adeudos": 0}
    first = run_mock_prediction(features)
    second = run_mock_prediction(features)
    assert first.score == second.score


def test_missing_reference_features_raises_insufficient_data():
    try:
        run_mock_prediction({"some_other_field": "x"})
        assert False, "expected InsufficientDataError"
    except InsufficientDataError as exc:
        assert "promedio_general" in exc.missing_features


def test_partial_features_use_neutral_defaults():
    response = run_mock_prediction({"materias_reprobadas": 2})
    assert 0.0 <= response.score <= 1.0


def test_predict_endpoint_happy_path(client, auth_headers):
    response = client.post(
        "/predict",
        json={
            "studentId": "s1",
            "contractVersion": "1",
            "features": {
                "promedio_general": 6.5,
                "materias_reprobadas": 2,
                "adeudos": 1,
            },
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["modelVersion"] == "mock-v0"
    assert 0.0 <= body["score"] <= 1.0
    assert body["riskLevel"] is None


def test_predict_endpoint_insufficient_data(client, auth_headers):
    response = client.post(
        "/predict",
        json={"studentId": "s1", "contractVersion": "1", "features": {}},
        headers=auth_headers,
    )
    assert response.status_code == 422
    assert response.json()["error"] == "INSUFFICIENT_DATA"
