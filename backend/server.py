from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import os
import json
import re
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Literal
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt as pyjwt
import requests

from llm_chat import LlmChat, UserMessage
from pdf_export import build_report_pdf

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# --- Config ---
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET_KEY']
GOOGLE_PLACES_API_KEY = os.environ.get('GOOGLE_PLACES_API_KEY', '')
JWT_ALG = os.environ.get('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get('ACCESS_TOKEN_EXPIRE_MINUTES', 10080))

client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
db = client[DB_NAME]

app = FastAPI(title="RoopCraft OS API")
api = APIRouter(prefix="/api")

# --- Models ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic

Category = Literal["Cafe","Restaurant","Hotel","Gym","Salon","Startup","Clinic","Real Estate","Other"]
LeadStatus = Literal["New","Contacted","Meeting Scheduled","Proposal Sent","Negotiation","Won","Lost"]
ModelChoice = Literal["gemini","claude","openai"]

class AuditCreate(BaseModel):
    business_name: str
    category: Category
    city: str
    state: str
    instagram_url: Optional[str] = ""
    website_url: Optional[str] = ""
    google_maps_url: Optional[str] = ""
    usp: Optional[str] = ""
    notes: Optional[str] = ""
    goal: Optional[str] = ""
    model: ModelChoice = "gemini"

class LeadStatusUpdate(BaseModel):
    status: LeadStatus

class CreatorAuditCreate(BaseModel):
    instagram_handle: str
    niche: Optional[str] = ""
    follower_count: Optional[str] = ""
    avg_likes: Optional[str] = ""
    avg_comments: Optional[str] = ""
    posting_frequency: Optional[str] = ""
    bio: Optional[str] = ""
    recent_captions: Optional[List[str]] = []
    content_notes: Optional[str] = ""
    collab_goal: Optional[str] = ""
    model: ModelChoice = "gemini"

class CreatorAudit(BaseModel):
    id: str
    user_id: str
    instagram_handle: str
    niche: str
    follower_count: str
    avg_likes: str
    avg_comments: str
    posting_frequency: str
    bio: str
    recent_captions: List[str]
    content_notes: str
    collab_goal: str
    model: str
    audit: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str

class Lead(BaseModel):
    id: str
    user_id: str
    business_name: str
    category: str
    city: str
    state: str
    instagram_url: str
    website_url: str
    google_maps_url: str
    business_phone: str
    usp: str
    notes: str
    goal: str
    status: str
    model: str
    report: Optional[Dict[str, Any]] = None
    sales_kit: Optional[Dict[str, Any]] = None
    proposal: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: str

# --- Auth helpers ---
security = HTTPBearer()

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    token = creds.credentials
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# --- Model mapping ---
MODEL_MAP = {
    "gemini": ("gemini", "gemini-3-flash-preview"),
    "claude": ("anthropic", "claude-sonnet-5"),
    "openai": ("openai", "gpt-5.5"),
}

def new_chat(session_id: str, system_message: str, model_choice: str) -> LlmChat:
    provider, model_name = MODEL_MAP.get(model_choice, MODEL_MAP["gemini"])
    return LlmChat(
        session_id=session_id,
        system_message=system_message,
    ).with_model(provider, model_name)

def extract_json(text: str) -> Dict[str, Any]:
    """Extract JSON object from an LLM response robustly."""
    if not text:
        return {}
    # Remove code fences
    cleaned = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*\}|\[.*\])\s*```", cleaned, re.DOTALL)
    if m:
        cleaned = m.group(1)
    else:
        # take first { ... } balanced block
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1:
            cleaned = cleaned[start:end+1]
    try:
        return json.loads(cleaned)
    except Exception:
        return {"raw": text}

# --- Prompts ---
REPORT_SYSTEM = """You are RoopCraft OS — a premier B2B growth strategist for local businesses.
You produce comprehensive, actionable business intelligence reports for agency owners preparing to pitch clients.
Always return valid JSON only, no prose outside the JSON. Be specific, insightful and strategic. Avoid generic filler.

For any reel/content ideas you generate, act as an elite Instagram Growth Strategist and Algorithm Expert,
following this framework:
1. UNDERSTAND THE NICHE: Before generating any idea, ground it in this specific business's target audience,
   their real pain points, and what would actually make THEM personally share or save a post — not generic advice.
2. OPTIMIZE FOR SHARES & RETENTION: Reverse-engineer the current Instagram algorithm's core engine signals —
   Watch Time (retention), Shares (DM forwarding), and Saves (value density). Do NOT recommend outdated tactics
   like hashtag stuffing, generic engagement pods, or unoriginal reposting. Every reel idea must include a
   "3-Second Hook" (the exact first line/on-screen text that stops the scroll) and a Share-or-Save-Optimized
   angle (why someone would send this to a friend or save it for later, not just like it).
3. PROVIDE ACTIONABLE BLUEPRINTS: Do not give vague one-line concepts. Give an exact shot-by-shot script layout
   (what happens second-by-second, on-screen text at each beat) so it could be filmed directly from your output.
4. TECHNICAL ALIGNMENT: Note technical alignment tips where relevant — native text overlays, trending audio,
   high-definition upload, and SEO keywords in the caption/on-screen text.
Tone for this content: practical, direct, encouraging, like an expert peer — no robotic corporate phrasing."""

SALES_KIT_SYSTEM = """You are RoopCraft OS — a world class sales copywriter for creative agencies.
Given a business intelligence report, generate personalized outreach scripts and sales content.
Always return valid JSON only. Scripts must feel human, warm, specific, and reference the business details."""

PROPOSAL_SYSTEM = """You are RoopCraft OS — a proposal architect for creative agencies.
Given a business intelligence report and sales kit, generate a full multi-section proposal.
Always return valid JSON only. Sections should be crisp, persuasive, and business-specific."""

CREATOR_AUDIT_SYSTEM = """You are RoopCraft OS — a talent scout and partnerships strategist for a creative agency
that connects brands with under-the-radar Instagram creators. You're evaluating a creator who has approached
the agency directly, usually someone with modest reach but genuinely strong content, to assess whether they're
worth partnering with and how to structure that partnership.
Always return valid JSON only, no prose outside the JSON. Be honest and specific — call out real weaknesses
alongside strengths, don't just flatter. Base every judgment only on the data actually provided; do not invent
follower counts, engagement numbers, or facts not given.
Before analyzing, sanity-check the numbers given: if average likes or comments are impossibly high relative to
follower count (e.g. average likes exceeding total followers, or an implied engagement rate above ~25%, which is
very rare organically), or if any figures look internally inconsistent, do not silently accept them — call this
out explicitly in "data_plausibility" and let it lower your confidence in the rest of the audit accordingly.

For the reel ideas and growth recommendations specifically, act as an elite Instagram Growth Strategist and
Algorithm Expert, following this framework:
1. UNDERSTAND THE NICHE: Ground every idea in this specific creator's actual niche, their likely audience's
   pain points, and what would make THAT audience personally share or save a post — not generic advice.
2. OPTIMIZE FOR SHARES & RETENTION: Reverse-engineer the current Instagram algorithm's core engine signals —
   Watch Time (retention), Shares (DM forwarding), and Saves (value density). Do NOT recommend outdated tactics
   like hashtag stuffing, generic engagement pods, or unoriginal reposting. Every reel idea must include a
   "3-Second Hook" (the exact first line/on-screen text that stops the scroll) and a share-or-save-optimized angle.
3. PROVIDE ACTIONABLE BLUEPRINTS: Give an exact shot-by-shot script layout, not a vague one-line concept —
   something filmable directly from your output.
4. TECHNICAL ALIGNMENT: Note technical tips where relevant — native text overlays, trending audio, high-definition
   upload, SEO keywords in caption/on-screen text.
Tone for this section: practical, direct, encouraging, like an expert peer — no robotic corporate phrasing."""

def creator_audit_prompt(a: CreatorAuditCreate) -> str:
    captions_block = "\n".join(f"- {c}" for c in (a.recent_captions or [])) or "N/A"
    return f"""Analyze the following Instagram creator profile (all data below was manually collected by the
agency from the creator's public profile — treat it as ground truth, do not assume anything beyond it) and
produce a partnership-readiness audit as JSON.

CREATOR INPUT
Handle: @{a.instagram_handle}
Niche: {a.niche or "N/A"}
Follower count: {a.follower_count or "N/A"}
Average likes per post: {a.avg_likes or "N/A"}
Average comments per post: {a.avg_comments or "N/A"}
Posting frequency: {a.posting_frequency or "N/A"}
Bio: {a.bio or "N/A"}
Recent post captions:
{captions_block}
Agency's notes on their content quality: {a.content_notes or "N/A"}
Reason for reaching out / collab goal: {a.collab_goal or "General brand partnership"}

Return a JSON object with exactly this shape:
{{
  "data_plausibility": {{
    "looks_consistent": true,
    "flags": ["array of specific concerns if any numbers look implausible or inconsistent, empty array if none"]
  }},
  "engagement_analysis": {{
    "estimated_engagement_rate": "string like '4.2%', computed from avg_likes+avg_comments vs follower_count if numbers are parseable, otherwise 'insufficient data'",
    "engagement_quality": "1-2 sentence read on whether engagement looks healthy/organic for this follower count",
    "reach_vs_quality_verdict": "1-2 sentences: is this a small-but-mighty account worth the bet, or a red flag?"
  }},
  "content_quality_assessment": {{
    "strengths": ["3-5 specific items based on the captions/notes given"],
    "weaknesses": ["2-4 specific items"],
    "consistency": "1-2 sentence assessment of posting frequency and content rhythm",
    "voice_and_style": "1-2 sentences describing their apparent content voice/aesthetic"
  }},
  "audience_fit": {{
    "likely_audience": "1-2 sentences on who probably follows this creator based on niche/content",
    "brand_categories_that_fit_well": ["3-5 short items, e.g. 'Local cafes', 'Sustainable fashion'"]
  }},
  "collaboration_potential": {{
    "verdict": "Strong Fit | Worth Testing | Not Ready Yet",
    "reasoning": "2-3 sentences justifying the verdict",
    "suggested_formats": ["3-5 items, e.g. 'Single Reel feature', 'Story takeover', 'Affiliate/discount code'"]
  }},
  "negotiation_talking_points": ["3-5 specific points the agency can raise when discussing terms, grounded in the data given"],
  "red_flags_to_verify": ["2-4 things worth double-checking in person before committing, e.g. engagement authenticity, audience location match — empty array if genuinely none"],
  "growth_recommendations": {{
    "best_times_to_post": ["3-4 specific day+time slots suited to this niche and likely audience, e.g. 'Tue/Thu 7-9pm IST — after work scroll window'"],
    "seo_and_discoverability": {{
      "bio_keywords_to_add": ["3-5 specific words/phrases missing from their bio that would improve searchability"],
      "hashtag_strategy": "1-2 sentences on hashtag approach for this niche (mix of broad/niche/branded)",
      "sample_hashtags": ["8-12 realistic hashtags fitting this niche"]
    }},
    "reel_ideas": [
      {{"hook": "the exact 3-second hook — first 1-2 lines/on-screen text that stops the scroll", "shot_by_shot_script": "a full 3-5 sentence shot-by-shot breakdown (not a compact timestamp list) — enough narrative detail that someone unfamiliar with the idea could film it directly: opening shot, what happens in the middle, how it resolves, any on-screen text shown", "share_save_angle": "why someone would DM this to a friend or save it, not just like it", "cta": "exact words/on-screen text at the end"}}
      // ... generate exactly 30 of these objects in this array, each genuinely distinct in hook/angle/script
    ]
  }},
  "outreach_message": "a warm, specific 70-110 word DM/email draft the agency can send this creator, referencing at least one real detail from their profile above"
}}

Rules:
- Generate exactly 30 reel_ideas inside growth_recommendations, each with a genuinely distinct hook, script, and share/save angle — do not repeat concepts.
- Return ONLY the JSON object. No markdown, no prose outside the JSON."""



def report_prompt(a: AuditCreate) -> str:
    return f"""Analyze the following business and generate a comprehensive intelligence report as JSON.

BUSINESS INPUT
Name: {a.business_name}
Category: {a.category}
Location: {a.city}, {a.state}
Instagram: {a.instagram_url or "N/A"}
Website: {a.website_url or "N/A"}
Google Maps: {a.google_maps_url or "N/A"}
USP: {a.usp or "N/A"}
Goal: {a.goal or "Grow brand recognition"}
Owner Notes: {a.notes or "N/A"}

Return a JSON object with exactly this shape:
{{
  "business_summary": {{
    "what_they_do": "string, 2-3 sentences",
    "brand_positioning": "string, 2-3 sentences",
    "customer_experience": "string, 2-3 sentences",
    "target_audience_estimated": "string, 1-2 sentences"
  }},
  "google_maps_analysis": {{
    "estimated_rating": "string like '4.5/5' (estimate if unknown)",
    "estimated_reviews": "string like '250+'",
    "positive_themes": ["array of 4-6 short phrases"],
    "common_complaints": ["array of 3-5 short phrases"],
    "peak_hours": "string, best guess"
  }},
  "instagram_audit": {{
    "bio_assessment": "1-2 sentence critique",
    "highlights": "1-2 sentence critique",
    "profile_picture": "1 sentence",
    "posting_frequency": "assessment",
    "reels": "assessment",
    "engagement": "assessment",
    "visual_consistency": "assessment",
    "strengths": ["3-5 items"],
    "weaknesses": ["3-5 items"],
    "missed_opportunities": ["3-5 items"],
    "quick_wins": ["3-5 items"]
  }},
  "nearby_opportunities": [
    {{"type": "Colleges|Offices|Hospitals|Tourist Attractions|Highways|Residential", "example": "specific example nearby if known or plausible", "how_to_target": "1-2 sentences"}}
  ],
  "competitor_analysis": [
    {{"name":"competitor name","followers":"~5k","content_quality":"...","posting_frequency":"...","hooks":"...","strengths":"...","weaknesses":"..."}}
  ],
  "growth_strategy": {{
    "target_audience": {{"primary":"...", "secondary":"...", "future":"..."}},
    "content_pillars": ["Lifestyle","Food","Behind the Scenes","UGC","Entertainment","Educational","Community"],
    "monthly_content_mix": [
      {{"pillar":"Food","percent":40}},
      {{"pillar":"Lifestyle","percent":20}},
      {{"pillar":"Community","percent":20}},
      {{"pillar":"Entertainment","percent":20}}
    ]
  }},
  "reel_ideas": [
    {{"category":"POV|Storytelling|Trends|UGC|Food|Staff|Customer Reactions|Behind the Scenes",
      "title":"...",
      "hook":"exact 3-second hook — the first line or on-screen text that stops the scroll",
      "shot_by_shot_script":"a full 3-5 SENTENCE shot-by-shot breakdown (not a compact timestamp list) — describe what happens at each beat in enough narrative detail that someone unfamiliar with the idea could film it directly: opening shot, what happens in the middle, how it resolves, and any on-screen text shown along the way",
      "share_save_angle":"why someone would DM this to a friend or save it for later, not just like it",
      "cta":"exact words/on-screen text for the call to action at the end",
      "technical_notes":"1 short tip: trending audio type, native text placement, or caption/SEO keyword to use"}}
  ]
}}

Rules:
- Generate 5-8 nearby_opportunities.
- Generate 5-8 competitor_analysis entries (plausible if unknown).
- Generate exactly 30 reel_ideas, distributed across the categories, each with a genuinely distinct hook and share/save angle.
- Be specific to the business's category and city.
- Return ONLY the JSON object. No markdown, no prose."""

def sales_kit_prompt(business_name: str, category: str, city: str, report: dict) -> str:
    return f"""Given this intelligence report for {business_name} ({category}, {city}), generate a full sales kit as JSON.

REPORT SUMMARY:
{json.dumps(report.get("business_summary", {}), indent=2)}
Instagram weaknesses: {json.dumps(report.get("instagram_audit", {}).get("weaknesses", []))}
Quick wins: {json.dumps(report.get("instagram_audit", {}).get("quick_wins", []))}

Return JSON of exactly this shape:
{{
  "cold_call_script": "Full script with intro, hook, value pitch, close. 200-300 words. Use [OWNER_NAME] placeholder.",
  "instagram_dm": "60-90 word DM referencing 1 specific detail from the report.",
  "whatsapp_message": "60-90 words, warm, conversational.",
  "meeting_opening": "First 60 seconds script for the in-person or video meeting.",
  "slide_speaker_notes": [
    {{"slide":"Cover","notes":"what to say"}},
    {{"slide":"Business Audit","notes":"..."}},
    {{"slide":"Growth Opportunities","notes":"..."}},
    {{"slide":"Strategy","notes":"..."}},
    {{"slide":"Timeline","notes":"..."}},
    {{"slide":"Pricing","notes":"..."}},
    {{"slide":"Portfolio","notes":"..."}},
    {{"slide":"Closing","notes":"..."}}
  ],
  "objection_handling": [
    {{"objection":"I'm busy","response":"..."}},
    {{"objection":"No budget","response":"..."}},
    {{"objection":"Already have an agency","response":"..."}},
    {{"objection":"Need to see results first","response":"..."}},
    {{"objection":"Let me think and reply","response":"..."}}
  ],
  "closing_script": "Professional closing script, 100-150 words."
}}

Return ONLY the JSON object. No markdown."""

def proposal_prompt(business_name: str, category: str, city: str, report: dict) -> str:
    return f"""Given this intelligence report for {business_name} ({category}, {city}), generate a full proposal as JSON.

REPORT HIGHLIGHTS:
Positioning: {report.get("business_summary", {}).get("brand_positioning", "")}
Instagram opportunities: {json.dumps(report.get("instagram_audit", {}).get("missed_opportunities", []))}
Growth strategy: {json.dumps(report.get("growth_strategy", {}), indent=2)[:800]}

Return JSON of exactly this shape:
{{
  "cover": {{"title":"Growth Blueprint for {business_name}","subtitle":"Prepared by RoopCraft"}},
  "audit": {{"summary":"3-4 sentence summary of current brand state","key_findings":["4-6 bullets"]}},
  "opportunities": {{"headline":"...","items":[{{"title":"...","description":"..."}}]}},
  "strategy": {{"headline":"...","pillars":[{{"name":"...","description":"..."}}],"deliverables":["4-6 bullets"]}},
  "timeline": [
    {{"month":"Month 1","focus":"...","deliverables":["..."]}},
    {{"month":"Month 2","focus":"...","deliverables":["..."]}},
    {{"month":"Month 3","focus":"...","deliverables":["..."]}}
  ],
  "pricing": {{"note":"Add your rate here","package_name":"Growth Partner","monthly_estimate":"₹XX,XXX / month","includes":["4-6 bullets"]}},
  "portfolio": {{"note":"Insert links or case studies","featured_cases":["Case Study 1","Case Study 2","Case Study 3"]}},
  "closing": "Professional closing paragraph, 4-6 sentences."
}}

Return ONLY the JSON object. No markdown."""

# --- Auth Routes ---
@api.post("/auth/register", response_model=TokenResponse)
async def register(body: UserCreate):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": body.email.lower(),
        "name": body.name,
        "hashed_password": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id)
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user_id, email=body.email.lower(), name=body.name),
    )

@api.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"])
    return TokenResponse(
        access_token=token,
        user=UserPublic(id=user["id"], email=user["email"], name=user["name"]),
    )

@api.get("/auth/me", response_model=UserPublic)
async def me(current=Depends(get_current_user)):
    return UserPublic(id=current["id"], email=current["email"], name=current["name"])

# --- Dashboard Stats ---
@api.get("/dashboard/stats")
async def dashboard_stats(current=Depends(get_current_user)):
    user_id = current["id"]
    leads = await db.leads.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    total = len(leads)
    by_status = {s: 0 for s in ["New","Contacted","Meeting Scheduled","Proposal Sent","Negotiation","Won","Lost"]}
    for lead_doc in leads:
        st = lead_doc.get("status", "New")
        by_status[st] = by_status.get(st, 0) + 1
    won = by_status["Won"]
    closed = won + by_status["Lost"]
    win_rate = round((won / closed) * 100) if closed > 0 else 0
    this_month_revenue = 0  # placeholder — deal value tracking not in MVP
    return {
        "total_leads": total,
        "meetings_scheduled": by_status["Meeting Scheduled"],
        "proposals_sent": by_status["Proposal Sent"] + by_status["Negotiation"] + won + by_status["Lost"],
        "active_clients": won,
        "win_rate": win_rate,
        "this_month_revenue": this_month_revenue,
        "by_status": by_status,
    }

def lookup_business_phone(business_name: str, category: str, city: str, state: str) -> Optional[str]:
    """Look up a business's publicly-listed phone number via Google Places API (New).
    Returns None (never raises) if no key is configured, nothing is found, or the call fails —
    a missing phone number should never break report generation."""
    if not GOOGLE_PLACES_API_KEY:
        return None
    try:
        query = f"{business_name}, {category}, {city}, {state}"
        resp = requests.post(
            "https://places.googleapis.com/v1/places:searchText",
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
                "X-Goog-FieldMask": "places.nationalPhoneNumber,places.internationalPhoneNumber,places.displayName",
            },
            json={"textQuery": query, "maxResultCount": 1},
            timeout=10,
        )
        resp.raise_for_status()
        places = resp.json().get("places", [])
        if not places:
            return None
        place = places[0]
        return place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber")
    except Exception:
        logger.exception("Google Places phone lookup failed (non-fatal, continuing without it)")
        return None

# --- Lead / Audit Routes ---
@api.post("/leads")
async def create_lead(body: AuditCreate, current=Depends(get_current_user)):
    """Create a lead + immediately generate AI intelligence report."""
    lead_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    # Generate report
    try:
        chat = new_chat(f"report-{lead_id}", REPORT_SYSTEM, body.model)
        response_text = await chat.send_message(UserMessage(text=report_prompt(body)))
        report = extract_json(response_text)
        _ri = report.get("reel_ideas", [])
        if _ri:
            logger.info("DEBUG reel_idea[0] FULL: %s", json.dumps(_ri[0], ensure_ascii=False))
            logger.info("DEBUG total reel_ideas count: %d", len(_ri))
        else:
            logger.info("DEBUG NO REEL IDEAS")
    except Exception as e:
        logger.exception("Report generation failed")
        raise HTTPException(status_code=500, detail=f"AI report generation failed: {str(e)}")

    business_phone = lookup_business_phone(body.business_name, body.category, body.city, body.state)

    doc = {
        "id": lead_id,
        "user_id": current["id"],
        "business_name": body.business_name,
        "category": body.category,
        "city": body.city,
        "state": body.state,
        "instagram_url": body.instagram_url or "",
        "website_url": body.website_url or "",
        "google_maps_url": body.google_maps_url or "",
        "business_phone": business_phone or "",
        "usp": body.usp or "",
        "notes": body.notes or "",
        "goal": body.goal or "",
        "status": "New",
        "model": body.model,
        "report": report,
        "sales_kit": None,
        "proposal": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.leads.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/leads")
async def list_leads(current=Depends(get_current_user)):
    leads = await db.leads.find(
        {"user_id": current["id"]},
        {"_id": 0, "report": 0, "sales_kit": 0, "proposal": 0}
    ).sort("created_at", -1).to_list(500)
    return leads

@api.get("/leads/{lead_id}")
async def get_lead(lead_id: str, current=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "user_id": current["id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@api.get("/leads/{lead_id}/report/pdf")
async def download_report_pdf(lead_id: str, current=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "user_id": current["id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.get("report"):
        raise HTTPException(status_code=400, detail="Generate the report first")
    buf = build_report_pdf(
        lead["report"], lead["business_name"], lead["category"], lead["city"], lead["state"]
    )
    filename = f"{lead['business_name'].replace(' ', '_')}_Report.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@api.patch("/leads/{lead_id}/status")
async def update_lead_status(lead_id: str, body: LeadStatusUpdate, current=Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    result = await db.leads.update_one(
        {"id": lead_id, "user_id": current["id"]},
        {"$set": {"status": body.status, "updated_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True, "status": body.status}

@api.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current=Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id, "user_id": current["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}

@api.post("/leads/{lead_id}/sales-kit")
async def generate_sales_kit(lead_id: str, current=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "user_id": current["id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.get("report"):
        raise HTTPException(status_code=400, detail="Report not ready")
    try:
        chat = new_chat(f"saleskit-{lead_id}", SALES_KIT_SYSTEM, lead.get("model","gemini"))
        text = await chat.send_message(UserMessage(
            text=sales_kit_prompt(lead["business_name"], lead["category"], lead["city"], lead["report"])
        ))
        kit = extract_json(text)
    except Exception as e:
        logger.exception("Sales kit generation failed")
        raise HTTPException(status_code=500, detail=f"Sales kit generation failed: {str(e)}")
    now = datetime.now(timezone.utc).isoformat()
    await db.leads.update_one(
        {"id": lead_id, "user_id": current["id"]},
        {"$set": {"sales_kit": kit, "updated_at": now}}
    )
    return kit

@api.post("/leads/{lead_id}/proposal")
async def generate_proposal(lead_id: str, current=Depends(get_current_user)):
    lead = await db.leads.find_one({"id": lead_id, "user_id": current["id"]}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if not lead.get("report"):
        raise HTTPException(status_code=400, detail="Report not ready")
    try:
        chat = new_chat(f"proposal-{lead_id}", PROPOSAL_SYSTEM, lead.get("model","gemini"))
        text = await chat.send_message(UserMessage(
            text=proposal_prompt(lead["business_name"], lead["category"], lead["city"], lead["report"])
        ))
        proposal = extract_json(text)
    except Exception as e:
        logger.exception("Proposal generation failed")
        raise HTTPException(status_code=500, detail=f"Proposal generation failed: {str(e)}")
    now = datetime.now(timezone.utc).isoformat()
    await db.leads.update_one(
        {"id": lead_id, "user_id": current["id"]},
        {"$set": {"proposal": proposal, "updated_at": now}}
    )
    return proposal

@api.post("/creators")
async def create_creator_audit(body: CreatorAuditCreate, current=Depends(get_current_user)):
    """Create a creator record + immediately generate an AI partnership audit."""
    creator_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    try:
        chat = new_chat(f"creator-audit-{creator_id}", CREATOR_AUDIT_SYSTEM, body.model)
        response_text = await chat.send_message(UserMessage(text=creator_audit_prompt(body)))
        audit = extract_json(response_text)
        _reels = audit.get("growth_recommendations", {}).get("reel_ideas", [])
        logger.info("DEBUG creator reel_ideas[0] keys: %s", list(_reels[0].keys()) if _reels else "NO REEL IDEAS")
    except Exception as e:
        logger.exception("Creator audit generation failed")
        raise HTTPException(status_code=500, detail=f"AI audit generation failed: {str(e)}")

    doc = {
        "id": creator_id,
        "user_id": current["id"],
        "instagram_handle": body.instagram_handle,
        "niche": body.niche or "",
        "follower_count": body.follower_count or "",
        "avg_likes": body.avg_likes or "",
        "avg_comments": body.avg_comments or "",
        "posting_frequency": body.posting_frequency or "",
        "bio": body.bio or "",
        "recent_captions": body.recent_captions or [],
        "content_notes": body.content_notes or "",
        "collab_goal": body.collab_goal or "",
        "model": body.model,
        "audit": audit,
        "created_at": now,
        "updated_at": now,
    }
    await db.creators.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.get("/creators")
async def list_creator_audits(current=Depends(get_current_user)):
    creators = await db.creators.find(
        {"user_id": current["id"]},
        {"_id": 0, "audit": 0, "recent_captions": 0}
    ).sort("created_at", -1).to_list(500)
    return creators

@api.get("/creators/{creator_id}")
async def get_creator_audit(creator_id: str, current=Depends(get_current_user)):
    creator = await db.creators.find_one({"id": creator_id, "user_id": current["id"]}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    return creator

@api.delete("/creators/{creator_id}")
async def delete_creator_audit(creator_id: str, current=Depends(get_current_user)):
    result = await db.creators.delete_one({"id": creator_id, "user_id": current["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Creator not found")
    return {"success": True}

@api.get("/")
async def root():
    return {"message": "RoopCraft OS API", "status": "ok"}

# Include router
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
