"""RoopCraft OS backend API tests.
Covers: auth (register/login/me), dashboard stats, lead CRUD, AI report/sales-kit/proposal.
IMPORTANT: LLM-invoking endpoints are limited to a MINIMUM (1 lead, 1 sales-kit, 1 proposal)
to save budget. All LLM tests use model='gemini'.
"""
import os
import time
import uuid
import pytest
import requests

# --- Config ---
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://growth-research-hub-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
LLM_TIMEOUT = 180  # seconds

# --- Shared state (test order matters here) ---
STATE = {"token": None, "user": None, "lead_id": None, "email": None, "password": "test1234"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def auth_headers():
    return {"Authorization": f"Bearer {STATE['token']}", "Content-Type": "application/json"}


# --- Health check ---
def test_root_health(client):
    r = client.get(f"{API}/", timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "ok"


# --- Auth ---
def test_register(client):
    email = f"TEST_{int(time.time())}_{uuid.uuid4().hex[:6]}@example.com"
    STATE["email"] = email
    r = client.post(f"{API}/auth/register", json={
        "email": email, "password": STATE["password"], "name": "Test User"
    }, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and data["access_token"]
    assert data["user"]["email"] == email.lower()
    assert data["user"]["name"] == "Test User"
    STATE["token"] = data["access_token"]
    STATE["user"] = data["user"]


def test_register_duplicate(client):
    r = client.post(f"{API}/auth/register", json={
        "email": STATE["email"], "password": STATE["password"], "name": "Test User"
    }, timeout=15)
    assert r.status_code == 400


def test_login(client):
    r = client.post(f"{API}/auth/login", json={
        "email": STATE["email"], "password": STATE["password"]
    }, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["id"] == STATE["user"]["id"]
    # refresh token
    STATE["token"] = data["access_token"]


def test_login_bad_password(client):
    r = client.post(f"{API}/auth/login", json={
        "email": STATE["email"], "password": "wrong_password"
    }, timeout=15)
    assert r.status_code == 401


def test_me(client):
    r = client.get(f"{API}/auth/me", headers=auth_headers(), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["email"] == STATE["email"].lower()


def test_auth_guard_leads(client):
    r = client.get(f"{API}/leads", timeout=15)
    # Missing auth should be 401/403 (FastAPI HTTPBearer returns 403 by default without credentials)
    assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


# --- Dashboard ---
def test_dashboard_stats_empty(client):
    r = client.get(f"{API}/dashboard/stats", headers=auth_headers(), timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    for key in ["total_leads", "meetings_scheduled", "proposals_sent",
                "active_clients", "win_rate", "this_month_revenue", "by_status"]:
        assert key in data, f"missing {key}"
    assert data["total_leads"] == 0
    assert isinstance(data["by_status"], dict)


# --- Leads: create (LLM) ---
def test_create_lead_with_report(client):
    payload = {
        "business_name": "TEST_Brew Cafe",
        "category": "Cafe",
        "city": "Bengaluru",
        "state": "Karnataka",
        "instagram_url": "https://instagram.com/testbrewcafe",
        "website_url": "",
        "google_maps_url": "",
        "usp": "Single-origin filter coffee and homemade pastries.",
        "notes": "Small owner-run cafe near Indiranagar.",
        "goal": "Grow to 5k Instagram followers in 3 months.",
        "model": "gemini",
    }
    r = client.post(f"{API}/leads", json=payload, headers=auth_headers(), timeout=LLM_TIMEOUT)
    assert r.status_code == 200, f"Status={r.status_code} Body={r.text[:500]}"
    lead = r.json()
    assert lead["id"] and lead["business_name"] == payload["business_name"]
    assert lead["status"] == "New"
    assert "_id" not in lead
    STATE["lead_id"] = lead["id"]

    # Verify report structure
    report = lead.get("report") or {}
    assert report and "raw" not in report, f"Report not parsed as JSON: {str(report)[:300]}"
    for key in ["business_summary", "google_maps_analysis", "instagram_audit",
                "nearby_opportunities", "competitor_analysis", "growth_strategy", "reel_ideas"]:
        assert key in report, f"report missing key: {key}. Keys: {list(report.keys())}"
    assert isinstance(report["reel_ideas"], list) and len(report["reel_ideas"]) > 0


def test_list_leads_summary(client):
    r = client.get(f"{API}/leads", headers=auth_headers(), timeout=15)
    assert r.status_code == 200, r.text
    leads = r.json()
    assert isinstance(leads, list) and len(leads) >= 1
    lead = next(l for l in leads if l["id"] == STATE["lead_id"])
    # Summary must NOT include heavy fields
    assert "report" not in lead
    assert "sales_kit" not in lead
    assert "proposal" not in lead
    assert lead["business_name"] == "TEST_Brew Cafe"


def test_get_lead_detail(client):
    r = client.get(f"{API}/leads/{STATE['lead_id']}", headers=auth_headers(), timeout=15)
    assert r.status_code == 200, r.text
    lead = r.json()
    assert lead["id"] == STATE["lead_id"]
    assert lead.get("report") is not None


def test_patch_lead_status(client):
    r = client.patch(f"{API}/leads/{STATE['lead_id']}/status",
                     json={"status": "Contacted"},
                     headers=auth_headers(), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("status") == "Contacted"
    # verify via GET
    r2 = client.get(f"{API}/leads/{STATE['lead_id']}", headers=auth_headers(), timeout=15)
    assert r2.json()["status"] == "Contacted"


def test_generate_sales_kit(client):
    r = client.post(f"{API}/leads/{STATE['lead_id']}/sales-kit",
                    headers=auth_headers(), timeout=LLM_TIMEOUT)
    assert r.status_code == 200, f"Status={r.status_code} Body={r.text[:500]}"
    kit = r.json()
    assert "raw" not in kit, f"Sales kit not parsed: {str(kit)[:300]}"
    for key in ["cold_call_script", "instagram_dm", "whatsapp_message",
                "meeting_opening", "slide_speaker_notes", "objection_handling",
                "closing_script"]:
        assert key in kit, f"sales_kit missing key: {key}"
    assert isinstance(kit["slide_speaker_notes"], list) and len(kit["slide_speaker_notes"]) > 0
    assert isinstance(kit["objection_handling"], list) and len(kit["objection_handling"]) > 0


def test_generate_proposal(client):
    r = client.post(f"{API}/leads/{STATE['lead_id']}/proposal",
                    headers=auth_headers(), timeout=LLM_TIMEOUT)
    assert r.status_code == 200, f"Status={r.status_code} Body={r.text[:500]}"
    prop = r.json()
    assert "raw" not in prop, f"Proposal not parsed: {str(prop)[:300]}"
    for key in ["cover", "audit", "opportunities", "strategy",
                "timeline", "pricing", "portfolio", "closing"]:
        assert key in prop, f"proposal missing key: {key}"


def test_dashboard_stats_after_lead(client):
    r = client.get(f"{API}/dashboard/stats", headers=auth_headers(), timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_leads"] >= 1


def test_delete_lead(client):
    r = client.delete(f"{API}/leads/{STATE['lead_id']}", headers=auth_headers(), timeout=15)
    assert r.status_code == 200, r.text
    # verify 404 on subsequent GET
    r2 = client.get(f"{API}/leads/{STATE['lead_id']}", headers=auth_headers(), timeout=15)
    assert r2.status_code == 404
