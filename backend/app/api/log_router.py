from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import LogEntry, LogUploadResponse
from app.services import parse_terraform_log, save_logs_to_db, get_all_logs, get_logs_by_level, search_logs

router = APIRouter()


@router.post("/upload", response_model=LogUploadResponse)
async def upload_log_file(
        file: UploadFile = File(...),
        db: Session = Depends(get_db)
):
    """Upload and parse Terraform JSON log file."""
    if not file.filename.endswith(('.json', '.log')):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")

    content = await file.read()
    content_str = content.decode('utf-8')

    # Parse the log file
    logs = parse_terraform_log(content_str, file.filename)

    if not logs:
        raise HTTPException(status_code=400, detail="No valid log entries found in the file")

    # Save to database
    count = save_logs_to_db(db, logs, file.filename)

    return LogUploadResponse(
        message="File uploaded successfully",
        entries_count=count,
        filename=file.filename
    )


@router.get("/logs", response_model=List[LogEntry])
def get_logs(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        level: Optional[str] = None,
        tf_resource_type: Optional[str] = None,
        timestamp_from: Optional[str] = None,
        timestamp_to: Optional[str] = None,
        group_by: Optional[str] = None,
        search_query: Optional[str] = None,
        db: Session = Depends(get_db)
):
    """Get logs from database with optional filtering."""
    if any([level, tf_resource_type, timestamp_from, timestamp_to, group_by, search_query]):
        logs = search_logs(
            db, skip, limit, level, tf_resource_type,
            timestamp_from, timestamp_to, group_by, search_query
        )
    else:
        logs = get_all_logs(db, skip, limit)

    return logs
