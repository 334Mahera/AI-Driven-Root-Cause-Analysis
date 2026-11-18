
from datetime import datetime, timezone
from typing import Optional, Any

import fitz

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Investigation, AuditLog
from ai.graph import analyze_incident, perform_rca


app = FastAPI(
    title="AIVOA AI Root Cause Analysis",
    description="Pharmaceutical Quality Investigation System",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# DATABASE CONNECTION
# --------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# HELPER: AUDIT LOG
# --------------------------------------------------

def add_audit_log(db, investigation_id, action, details):
    log = AuditLog(
        investigation_id=investigation_id,
        action=action,
        details=details
    )
    db.add(log)


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class InvestigationCreate(BaseModel):
    incident_id: str
    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    equipment: Optional[str] = None
    incident_type: Optional[str] = None
    description: Optional[str] = None
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None

    five_whys: Optional[Any] = None
    fishbone: Optional[Any] = None
    potential_causes: Optional[Any] = None
    missing_evidence: Optional[Any] = None
    capa_recommendations: Optional[Any] = None


class InvestigationUpdate(BaseModel):
    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    equipment: Optional[str] = None
    incident_type: Optional[str] = None
    description: Optional[str] = None
    expected_value: Optional[str] = None
    actual_value: Optional[str] = None

    five_whys: Optional[Any] = None
    fishbone: Optional[Any] = None
    potential_causes: Optional[Any] = None
    missing_evidence: Optional[Any] = None
    capa_recommendations: Optional[Any] = None


class IncidentTextRequest(BaseModel):
    incident_text: str


class ApprovalRequest(BaseModel):
    reviewer_name: str
    review_comments: Optional[str] = None


# --------------------------------------------------
# HELPER: INVESTIGATION RESPONSE
# --------------------------------------------------

def investigation_response(item):
    return {
        "id": item.id,
        "incident_id": item.incident_id,
        "product_name": item.product_name,
        "batch_number": item.batch_number,
        "equipment": item.equipment,
        "incident_type": item.incident_type,
        "description": item.description,
        "expected_value": item.expected_value,
        "actual_value": item.actual_value,
        "five_whys": item.five_whys,
        "fishbone": item.fishbone,
        "potential_causes": item.potential_causes,
        "missing_evidence": item.missing_evidence,
        "capa_recommendations": item.capa_recommendations,
        "status": item.status,
        "reviewer_name": item.reviewer_name,
        "review_comments": item.review_comments,
        "approved_at": item.approved_at,
        "committed_at": item.committed_at,
        "created_at": item.created_at,
        "evidences": [
            {
                "id": evidence.id,
                "file_name": evidence.file_name,
                "file_type": evidence.file_type
            }
            for evidence in item.evidences
        ],
        "root_causes": [
            {
                "id": cause.id,
                "analysis_method": cause.analysis_method,
                "why_analysis": cause.why_analysis,
                "identified_cause": cause.identified_cause,
                "supporting_evidence": cause.supporting_evidence,
                "confidence": cause.confidence,
                "verification_status": cause.verification_status
            }
            for cause in item.root_causes
        ],
        "capa_actions": [
            {
                "id": action.id,
                "action_type": action.action_type,
                "description": action.description,
                "assigned_to": action.assigned_to,
                "due_date": action.due_date,
                "status": action.status
            }
            for action in item.capa_actions
        ]
    }


# --------------------------------------------------
# HOME API
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "AIVOA RCA Backend is running!"
    }


# --------------------------------------------------
# HEALTH CHECK API
# --------------------------------------------------

@app.get("/api/health")
def health():
    return {
        "status": "success",
        "message": "Backend connected successfully",
        "application": "AI Root Cause Analysis"
    }


# --------------------------------------------------
# CREATE INVESTIGATION
# --------------------------------------------------

@app.post("/api/investigations")
def create_investigation(
    data: InvestigationCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(Investigation).filter(
        Investigation.incident_id == data.incident_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Incident ID already exists"
        )

    investigation = Investigation(
        **data.model_dump(),
        status="Draft"
    )

    try:
        db.add(investigation)
        db.flush()

        add_audit_log(
            db,
            investigation.id,
            "Investigation Created",
            "New investigation created and saved as Draft."
        )

        db.commit()
        db.refresh(investigation)

        return {
            "message": "Investigation saved successfully",
            "id": investigation.id,
            "incident_id": investigation.incident_id,
            "status": investigation.status
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to save investigation: {str(e)}"
        )


# --------------------------------------------------
# RETRIEVE ALL INVESTIGATIONS
# --------------------------------------------------

@app.get("/api/investigations")
def get_investigations(db: Session = Depends(get_db)):
    investigations = db.query(Investigation).order_by(
        Investigation.id.desc()
    ).all()

    return [
        investigation_response(item)
        for item in investigations
    ]


# --------------------------------------------------
# RETRIEVE ONE INVESTIGATION
# --------------------------------------------------

@app.get("/api/investigations/{investigation_id}")
def get_investigation(
    investigation_id: int,
    db: Session = Depends(get_db)
):
    item = db.query(Investigation).filter(
        Investigation.id == investigation_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    return investigation_response(item)


# --------------------------------------------------
# UPDATE INVESTIGATION / SAVE HUMAN REVIEW
# --------------------------------------------------

@app.patch("/api/investigations/{investigation_id}")
def update_investigation(
    investigation_id: int,
    data: InvestigationUpdate,
    db: Session = Depends(get_db)
):
    item = db.query(Investigation).filter(
        Investigation.id == investigation_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    if item.status in ["Approved", "Committed"]:
        raise HTTPException(
            status_code=400,
            detail="Approved or committed investigations cannot be edited."
        )

    updates = data.model_dump(exclude_unset=True)

    for field, value in updates.items():
        setattr(item, field, value)

    try:
        add_audit_log(
            db,
            item.id,
            "Investigation Updated",
            "Investigation details and RCA findings were updated."
        )

        db.commit()
        db.refresh(item)

        return {
            "message": "Investigation updated successfully",
            "status": item.status,
            "investigation": investigation_response(item)
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to update investigation: {str(e)}"
        )


# --------------------------------------------------
# SUBMIT INVESTIGATION FOR REVIEW
# --------------------------------------------------

@app.post("/api/investigations/{investigation_id}/submit-review")
def submit_for_review(
    investigation_id: int,
    db: Session = Depends(get_db)
):
    item = db.query(Investigation).filter(
        Investigation.id == investigation_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    if item.status != "Draft":
        raise HTTPException(
            status_code=400,
            detail="Only Draft investigations can be submitted for review."
        )

    item.status = "Under Review"

    add_audit_log(
        db,
        item.id,
        "Submitted for Review",
        "Investigation submitted for investigator review."
    )

    db.commit()
    db.refresh(item)

    return {
        "message": "Investigation submitted for review",
        "status": item.status
    }


# --------------------------------------------------
# APPROVE INVESTIGATION
# --------------------------------------------------

@app.post("/api/investigations/{investigation_id}/approve")
def approve_investigation(
    investigation_id: int,
    data: ApprovalRequest,
    db: Session = Depends(get_db)
):
    item = db.query(Investigation).filter(
        Investigation.id == investigation_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    if item.status != "Under Review":
        raise HTTPException(
            status_code=400,
            detail="Only investigations Under Review can be approved."
        )

    if not data.reviewer_name.strip():
        raise HTTPException(
            status_code=400,
            detail="Reviewer name is required."
        )

    item.status = "Approved"
    item.reviewer_name = data.reviewer_name.strip()
    item.review_comments = data.review_comments
    item.approved_at = datetime.now(timezone.utc)

    add_audit_log(
        db,
        item.id,
        "Investigation Approved",
        f"Approved by {item.reviewer_name}. "
        f"Comments: {item.review_comments or 'No comments'}"
    )

    db.commit()
    db.refresh(item)

    return {
        "message": "Investigation approved successfully",
        "status": item.status,
        "reviewer_name": item.reviewer_name,
        "approved_at": item.approved_at
    }


# --------------------------------------------------
# COMMIT TO QMS LEDGER
# --------------------------------------------------

@app.post("/api/investigations/{investigation_id}/commit")
def commit_investigation(
    investigation_id: int,
    db: Session = Depends(get_db)
):
    item = db.query(Investigation).filter(
        Investigation.id == investigation_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    if item.status != "Approved":
        raise HTTPException(
            status_code=400,
            detail="Only approved investigations can be committed."
        )

    item.status = "Committed"
    item.committed_at = datetime.now(timezone.utc)

    add_audit_log(
        db,
        item.id,
        "Committed to QMS Ledger",
        "Approved investigation committed to the application's QMS record."
    )

    db.commit()
    db.refresh(item)

    return {
        "message": "Investigation committed successfully",
        "status": item.status,
        "incident_id": item.incident_id,
        "committed_at": item.committed_at
    }


# --------------------------------------------------
# GET INVESTIGATION AUDIT HISTORY
# --------------------------------------------------

@app.get("/api/investigations/{investigation_id}/audit")
def get_audit_history(
    investigation_id: int,
    db: Session = Depends(get_db)
):
    item = db.query(Investigation).filter(
        Investigation.id == investigation_id
    ).first()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    logs = db.query(AuditLog).filter(
        AuditLog.investigation_id == investigation_id
    ).order_by(AuditLog.id.asc()).all()

    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "created_at": log.created_at
        }
        for log in logs
    ]


# --------------------------------------------------
# AI INCIDENT EXTRACTION API
# --------------------------------------------------

@app.post("/api/analyze")
def analyze_incident_api(data: IncidentTextRequest):

    if not data.incident_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Incident report cannot be empty"
        )

    try:
        result = analyze_incident(data.incident_text)

        return {
            "status": "success",
            "message": "Incident analyzed successfully",
            "extracted_data": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI analysis failed: {str(e)}"
        )


# --------------------------------------------------
# PDF UPLOAD AND TEXT EXTRACTION
# --------------------------------------------------

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file."
        )

    try:
        pdf_bytes = await file.read()

        if len(pdf_bytes) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="PDF must be smaller than 10 MB."
            )

        document = fitz.open(
            stream=pdf_bytes,
            filetype="pdf"
        )

        extracted_text = "\n".join(
            page.get_text() for page in document
        )

        document.close()

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="No selectable text found. This PDF may be scanned."
            )

        return {
            "status": "success",
            "filename": file.filename,
            "extracted_text": extracted_text
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"PDF extraction failed: {str(e)}"
        )


# --------------------------------------------------
# COMPLETE AI ROOT CAUSE ANALYSIS API
# --------------------------------------------------

@app.post("/api/rca")
def generate_root_cause_analysis(data: IncidentTextRequest):

    if not data.incident_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Incident report cannot be empty"
        )

    try:
        result = perform_rca(data.incident_text)

        return {
            "status": "success",
            "message": "Root Cause Analysis generated successfully",
            "extracted_data": result["extracted_data"],
            "rca": result["rca"]
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RCA generation failed: {str(e)}"
        )
