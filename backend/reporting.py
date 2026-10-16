
import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DB_PATH = BASE_DIR / "securewealth.db"

router = APIRouter(prefix="/api/reports", tags=["Cyber Fraud Reports"])

api_key = os.getenv("GEMINI_API_KEY")
gemini = genai.Client(api_key=api_key) if api_key else None

SCAM_TYPES = (
    "UPI fraud",
    "Phishing",
    "Fake customer support",
    "Investment scam",
    "Remote access scam",
    "QR code scam",
    "Identity theft",
    "Other",
)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def initialize_reporting_db():
    with sqlite3.connect(DB_PATH) as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS fraud_incidents (
                id TEXT PRIMARY KEY,
                scam_type TEXT NOT NULL,
                transaction_id TEXT NOT NULL DEFAULT '',
                amount REAL,
                incident_time TEXT NOT NULL DEFAULT '',
                bank_or_app TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL,
                contact_details TEXT NOT NULL DEFAULT '',
                complaint_draft TEXT NOT NULL DEFAULT '',
                evidence_json TEXT NOT NULL DEFAULT '[]',
                acknowledgement_number TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'Draft',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)


initialize_reporting_db()


class IncidentCreate(BaseModel):
    scam_type: str = Field(min_length=1, max_length=80)
    transaction_id: str = Field(default="", max_length=150)
    amount: float | None = Field(default=None, gt=0, le=100_000_000)
    incident_time: str = Field(default="", max_length=80)
    bank_or_app: str = Field(default="", max_length=120)
    description: str = Field(min_length=10, max_length=5000)
    contact_details: str = Field(default="", max_length=200)


class DraftRequest(BaseModel):
    incident_id: str = Field(min_length=1, max_length=80)


class EvidenceMetadata(BaseModel):
    filename: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=500)


class IncidentStatusUpdate(BaseModel):
    acknowledgement_number: str = Field(default="", max_length=150)
    status: Literal[
        "Draft",
        "Ready to submit",
        "Submitted by user",
        "Resolved",
        "Closed"
    ] = "Draft"


def get_incident(incident_id: str):
    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        row = db.execute(
            "SELECT * FROM fraud_incidents WHERE id = ?",
            (incident_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found.")

    item = dict(row)
    item["evidence"] = json.loads(item.pop("evidence_json"))
    return item


@router.post("/incidents", status_code=201)
def create_incident(payload: IncidentCreate):
    scam_type = payload.scam_type.strip()

    if scam_type not in SCAM_TYPES:
        raise HTTPException(status_code=422, detail="Choose a supported scam type.")

    incident_id = str(uuid.uuid4())
    timestamp = now_iso()

    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            """
            INSERT INTO fraud_incidents (
                id, scam_type, transaction_id, amount, incident_time,
                bank_or_app, description, contact_details,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                incident_id,
                scam_type,
                payload.transaction_id.strip(),
                payload.amount,
                payload.incident_time.strip(),
                payload.bank_or_app.strip(),
                payload.description.strip(),
                payload.contact_details.strip(),
                timestamp,
                timestamp,
            ),
        )

    return {
        "incident": get_incident(incident_id),
        "message": "Incident saved locally. No government complaint has been submitted.",
    }


@router.get("/incidents")
def list_incidents():
    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        rows = db.execute(
            """
            SELECT id, scam_type, transaction_id, amount, incident_time,
                   bank_or_app, complaint_draft, acknowledgement_number,
                   status, created_at, updated_at
            FROM fraud_incidents
            ORDER BY created_at DESC
            LIMIT 100
            """
        ).fetchall()

    return {"incidents": [dict(row) for row in rows]}


@router.get("/incidents/{incident_id}")
def incident_details(incident_id: str):
    return {"incident": get_incident(incident_id)}


@router.post("/generate-draft")
def generate_complaint(payload: DraftRequest):
    incident = get_incident(payload.incident_id)

    if gemini is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Check backend/.env.",
        )

    # Send only the information necessary for drafting.
    # Avoid sending contact details or evidence files to the AI.
    facts = {
        "scam_type": incident["scam_type"],
        "transaction_id": incident["transaction_id"],
        "amount": incident["amount"],
        "incident_time": incident["incident_time"],
        "bank_or_app": incident["bank_or_app"],
        "description": incident["description"],
    }

    prompt = f"""
You help users prepare factual Indian cyber-financial-fraud complaints.

Create a clear, formal complaint draft based ONLY on the supplied facts.

Rules:
- Never invent names, dates, amounts, transaction IDs, or events.
- Clearly mark missing details as [ADD DETAILS].
- Use first-person wording for the complainant.
- State the sequence of events, known transaction details,
  suspected fraud method, and requested assistance.
- Do not claim that funds have been frozen or recovered.
- Do not claim the complaint has been filed.
- Do not provide a fake complaint or acknowledgement number.
- Do not include legal conclusions that are not supported by the facts.
- Finish with a short list of missing information to review.
- Return plain text with headings.

Incident facts:
{json.dumps(facts, ensure_ascii=False, indent=2)}
"""

    try:
        result = gemini.models.generate_content(
            model="gemini-3.8-flash",
            contents=prompt,
        )
        draft = (result.text or "").strip()

        if not draft:
            raise HTTPException(
                status_code=502,
                detail="Gemini returned an empty complaint draft.",
            )

    except HTTPException:
        raise
    except Exception as error:
        print(f"Complaint generation failed: {type(error).__name__}: {error}")
        raise HTTPException(
            status_code=502,
            detail="Could not generate the complaint. Check backend logs.",
        )

    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            """
            UPDATE fraud_incidents
            SET complaint_draft = ?, updated_at = ?
            WHERE id = ?
            """,
            (draft, now_iso(), payload.incident_id),
        )

    return {
        "incident_id": payload.incident_id,
        "draft": draft,
        "status": "Draft",
        "submitted_to_government": False,
    }


@router.post("/incidents/{incident_id}/evidence")
def add_evidence_metadata(
    incident_id: str,
    payload: EvidenceMetadata,
):
    incident = get_incident(incident_id)
    evidence = incident["evidence"]

    evidence.append({
        "id": str(uuid.uuid4()),
        "filename": payload.filename.strip(),
        "description": payload.description.strip(),
        "added_at": now_iso(),
        "storage": "metadata_only",
    })

    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            """
            UPDATE fraud_incidents
            SET evidence_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (json.dumps(evidence), now_iso(), incident_id),
        )

    return {
        "incident_id": incident_id,
        "evidence": evidence,
        "message": (
            "Evidence metadata saved. The actual file has not been uploaded."
        ),
    }


@router.patch("/incidents/{incident_id}/status")
def update_incident_status(
    incident_id: str,
    payload: IncidentStatusUpdate,
):
    get_incident(incident_id)

    with sqlite3.connect(DB_PATH) as db:
        db.execute(
            """
            UPDATE fraud_incidents
            SET acknowledgement_number = ?, status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.acknowledgement_number.strip(),
                payload.status,
                now_iso(),
                incident_id,
            ),
        )

    return {
        "incident": get_incident(incident_id),
        "message": "Local incident record updated.",
        "government_status_verified": False,
    }
