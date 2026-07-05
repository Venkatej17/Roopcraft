"""Lead CRUD tests that bypass LLM by seeding a lead directly into MongoDB.
Used because EMERGENT_LLM_KEY is out of budget in this environment.
"""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone
from pymongo import MongoClient

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://growth-research-hub-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "roopcraft_os")

STATE = {"token": None, "user_id": None, "lead_id": None}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mongo():
    m = MongoClient(MONGO_URL)
    yield m[DB_NAME]
    m.close()


def auth():
    return {"Authorization": f"Bearer {STATE['token']}", "Content-Type": "application/json"}


def test_seed_user_and_lead(client, mongo):
    """Register user via API, then seed a lead directly into MongoDB with a fake report."""
    email = f"TEST_SEED_{int(time.time())}_{uuid.uuid4().hex[:6]}@example.com"
    r = client.post(f"{API}/auth/register", json={
        "email": email, "password": "test1234", "name": "Seed User"
    }, timeout=15)
    assert r.status_code == 200, r.text
    STATE["token"] = r.json()["access_token"]
    STATE["user_id"] = r.json()["user"]["id"]

    # Seed a lead directly with a plausible report structure
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    fake_report = {
        "business_summary": {"what_they_do": "cafe", "brand_positioning": "premium",
                             "customer_experience": "warm", "target_audience_estimated": "young pros"},
        "google_maps_analysis": {"estimated_rating": "4.5/5", "estimated_reviews": "200+",
                                 "positive_themes": ["coffee"], "common_complaints": ["parking"],
                                 "peak_hours": "9-11am"},
        "instagram_audit": {"bio_assessment": "ok", "highlights": "ok", "profile_picture": "ok",
                            "posting_frequency": "3/wk", "reels": "few", "engagement": "mid",
                            "visual_consistency": "ok", "strengths": ["a"], "weaknesses": ["b"],
                            "missed_opportunities": ["c"], "quick_wins": ["d"]},
        "nearby_opportunities": [{"type": "Offices", "example": "IT park", "how_to_target": "lunch combos"}],
        "competitor_analysis": [{"name": "X", "followers": "5k", "content_quality": "ok",
                                 "posting_frequency": "daily", "hooks": "food p*rn",
                                 "strengths": "consistent", "weaknesses": "boring"}],
        "growth_strategy": {"target_audience": {"primary": "young pros", "secondary": "students", "future": "families"},
                            "content_pillars": ["Food", "Lifestyle"],
                            "monthly_content_mix": [{"pillar": "Food", "percent": 60}]},
        "reel_ideas": [{"category": "Food", "title": "Latte art", "hook": "Watch this!", "description": "..."}]
    }
    doc = {
        "id": lead_id, "user_id": STATE["user_id"],
        "business_name": "TEST_Seeded Cafe", "category": "Cafe",
        "city": "Bengaluru", "state": "Karnataka",
        "instagram_url": "", "website_url": "", "google_maps_url": "",
        "usp": "", "notes": "", "goal": "",
        "status": "New", "model": "gemini",
        "report": fake_report, "sales_kit": None, "proposal": None,
        "created_at": now, "updated_at": now,
    }
    mongo.leads.insert_one(doc)
    STATE["lead_id"] = lead_id


def test_list_leads_returns_seeded(client):
    r = client.get(f"{API}/leads", headers=auth(), timeout=15)
    assert r.status_code == 200, r.text
    leads = r.json()
    ids = [l["id"] for l in leads]
    assert STATE["lead_id"] in ids
    lead = next(l for l in leads if l["id"] == STATE["lead_id"])
    # Summary excludes heavy fields
    assert "report" not in lead
    assert "sales_kit" not in lead
    assert "proposal" not in lead


def test_get_lead_detail(client):
    r = client.get(f"{API}/leads/{STATE['lead_id']}", headers=auth(), timeout=15)
    assert r.status_code == 200, r.text
    lead = r.json()
    assert lead["id"] == STATE["lead_id"]
    assert lead.get("report") and "business_summary" in lead["report"]
    assert "_id" not in lead


def test_patch_lead_status(client):
    r = client.patch(f"{API}/leads/{STATE['lead_id']}/status",
                     json={"status": "Contacted"}, headers=auth(), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "Contacted"
    verify = client.get(f"{API}/leads/{STATE['lead_id']}", headers=auth(), timeout=15).json()
    assert verify["status"] == "Contacted"


def test_dashboard_stats_reflects_lead(client):
    r = client.get(f"{API}/dashboard/stats", headers=auth(), timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_leads"] >= 1
    assert data["by_status"]["Contacted"] >= 1


def test_delete_lead(client):
    r = client.delete(f"{API}/leads/{STATE['lead_id']}", headers=auth(), timeout=15)
    assert r.status_code == 200, r.text
    r2 = client.get(f"{API}/leads/{STATE['lead_id']}", headers=auth(), timeout=15)
    assert r2.status_code == 404


def test_get_missing_lead_404(client):
    r = client.get(f"{API}/leads/{uuid.uuid4()}", headers=auth(), timeout=15)
    assert r.status_code == 404
