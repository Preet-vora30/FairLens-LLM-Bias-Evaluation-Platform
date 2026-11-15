import io
import uuid
import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ReportRecord, EvaluationJob, EvaluationResult, EvaluationEvidence, ModelRecord, DatasetRecord
from app.schemas.reports import ReportCreate, ReportResponse
from app.services.reporting.report_generator import ReportGenerator, generate_free_report

try:
    from markdown import markdown
except Exception:
    markdown = None

router = APIRouter(prefix="/reports", tags=["Reports"])


def _to_report_response(record: ReportRecord) -> ReportResponse:
    return ReportResponse(
        id=record.id,
        title=record.title,
        evaluation_id=record.evaluation_id,
        format=record.format,
        content=record.content,
        summary_metrics=record.summary_metrics or {},
        created_at=record.created_at,
    )


@router.get("", response_model=List[ReportResponse])
def list_reports(db: Session = Depends(get_db)):
    from typing import List
    reports = db.query(ReportRecord).order_by(ReportRecord.created_at.desc()).all()
    return [_to_report_response(r) for r in reports]


@router.post("/{evaluation_id}", response_model=ReportResponse)
def generate_report_for_evaluation(evaluation_id: str, payload: ReportCreate, db: Session = Depends(get_db)):
    report = ReportGenerator(db).generate_research_report(evaluation_id, title=payload.title)
    record = ReportRecord(
        id=f"rep_{str(uuid.uuid4())[:8]}",
        title=report["title"],
        evaluation_id=evaluation_id,
        format=report["format"],
        content=report["content"],
        summary_metrics=report["summary_metrics"],
        created_at=datetime.datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_report_response(record)


@router.post("", response_model=ReportResponse)
def create_report(payload: ReportCreate, db: Session = Depends(get_db)):
    """Compile and persist a research report, optionally bound to a completed evaluation."""
    if payload.evaluation_id:
        return generate_report_for_evaluation(payload.evaluation_id, payload, db)

    # Free-form report not bound to an evaluation.
    report = generate_free_report(title=payload.title)
    record = ReportRecord(
        id=f"rep_{str(uuid.uuid4())[:8]}",
        title=report["title"],
        evaluation_id=None,
        format=report["format"],
        content=report["content"],
        summary_metrics=report["summary_metrics"],
        created_at=datetime.datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _to_report_response(record)


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    record = db.query(ReportRecord).filter(ReportRecord.id == report_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return _to_report_response(record)


@router.get("/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db)):
    record = db.query(ReportRecord).filter(ReportRecord.id == report_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    return StreamingResponse(
        io.BytesIO(record.content.encode("utf-8")),
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={report_id}.md"},
    )


@router.get("/{report_id}/pdf")
def get_report_pdf(report_id: str, db: Session = Depends(get_db)):
    """Generate a PDF version of the markdown report via markdown + weasyprint."""
    record = db.query(ReportRecord).filter(ReportRecord.id == report_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")

    try:
        if markdown is None:
            raise ImportError("markdown package not available")
        from weasyprint import HTML
        html_content = markdown(record.content, extensions=["tables", "fenced_code"])
        full_html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: 'Inter', sans-serif; margin: 40px; }}
                h1, h2, h3 {{ color: #2c3e50; }}
                table {{ border-collapse: collapse; width: 100%; margin-top: 1em; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>{html_content}</body>
        </html>
        """
        pdf_bytes = HTML(string=full_html).write_pdf()
        pdf_stream = io.BytesIO(pdf_bytes)
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={report_id}.pdf"},
        )
    except Exception as e:
        msg = str(e)
        lower = msg.lower()
        if isinstance(e, (ImportError, OSError)) or "libgobject" in lower or "cannot load library" in lower or "weasyprint" in lower or "gtk" in lower or "pango" in lower:
            raise HTTPException(status_code=503, detail=f"PDF export is unavailable: {msg}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report: {msg}")
