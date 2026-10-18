from datetime import date, timedelta

from app.services.visas import DATE_LABELS, VISAS, catalog

USER = {"email": "me@example.com", "password": "correct-horse", "full_name": "Test User"}


def login(client):
    client.cookies.clear()
    client.post("/api/auth/signup", json=USER)


def test_catalog_is_consistent():
    codes = [v.code for v in VISAS]
    assert len(codes) == len(set(codes))
    category_ids = {c["id"] for c in catalog()["categories"]}
    for v in VISAS:
        assert v.category in category_ids, v.code
        assert v.description and v.name, v.code
        assert "passport_expiry" in v.dates or v.code == "Other", v.code
        assert set(v.dates) <= set(DATE_LABELS), v.code


def test_saved_values_from_older_versions_still_valid():
    old = {"F-1", "F-1 OPT", "F-1 STEM OPT", "F-2", "H-1B", "H-4", "H-4 EAD", "Green Card Pending", "Green Card", "Other"}
    assert old <= {v.code for v in VISAS}


def test_all_requested_kinds_are_covered():
    by_cat = {}
    for v in VISAS:
        by_cat.setdefault(v.category, set()).add(v.code)
    assert {"H-1B", "L-1", "O-1", "TN", "E-3", "E-2"} <= by_cat["work"]
    assert {"H-4", "F-2", "L-2", "J-2"} <= by_cat["family"]
    assert {"B-1/B-2", "ESTA"} <= by_cat["visitor"]
    assert {"K-1", "Green Card", "Green Card Pending", "Conditional Green Card"} <= by_cat["immigrant"]


def test_catalog_endpoint(client):
    data = client.get("/api/visas").json()
    assert [c["id"] for c in data["categories"]][:3] == ["work", "student", "family"]
    h4 = next(v for v in data["visas"] if v["code"] == "H-4")
    assert {"field": "i94_expiry", "label": "I-94 expiry"} in h4["dates"]


def test_profile_accepts_new_status_and_dates(client):
    login(client)
    due = (date.today() + timedelta(days=60)).isoformat()
    r = client.put("/api/profile", json={"visa_type": "Conditional Green Card", "conditional_residence_expiry": due, "green_card_expiry": due})
    assert r.status_code == 200
    assert client.get("/api/profile").json()["conditional_residence_expiry"] == due
    labels = [k["label"] for k in client.get("/api/key-dates").json()]
    assert "Conditional residence ends" in labels and "Green card expiry" in labels


def test_tourist_status_with_esta(client):
    login(client)
    due = (date.today() + timedelta(days=20)).isoformat()
    assert client.put("/api/profile", json={"visa_type": "ESTA", "esta_expiry": due}).status_code == 200
    assert client.get("/api/key-dates").json()[0]["label"] == "ESTA expiry"


def test_unknown_status_rejected_for_profile_and_dependents(client):
    login(client)
    assert client.put("/api/profile", json={"visa_type": "Z-9"}).status_code == 422
    assert client.post("/api/dependents", json={"name": "A", "relationship": "child", "visa_type": "Z-9"}).status_code == 422


def test_dependent_can_use_new_family_statuses(client):
    login(client)
    for code in ["L-2", "J-2", "F-2", "E-3D", "TD", "O-3"]:
        assert client.post("/api/dependents", json={"name": code, "relationship": "spouse", "visa_type": code}).status_code == 201
