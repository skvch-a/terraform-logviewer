from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import LogEntry, LogUploadResponse, LogWithSectionsResponse, DeleteResponse
from app.services import (
    parse_terraform_log, 
    parse_terraform_log_with_sections,
    save_logs_to_db, 
    get_all_logs, 
    get_logs_by_level,
    delete_all_logs,
    get_gantt_data,
    get_sections_from_db
)

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
    logs, fixed_count = parse_terraform_log(content_str)

    if not logs:
        raise HTTPException(status_code=400, detail="No valid log entries found in the file")

    # Save to database
    count = save_logs_to_db(db, logs, file.filename)

    return LogUploadResponse(
        message="File uploaded successfully",
        entries_count=count,
        filename=file.filename,
        fixed_logs_count=fixed_count
    )


@router.post("/logs/sections", response_model=LogWithSectionsResponse)
async def parse_log_with_sections(
        file: UploadFile = File(...),
):
    """Parse Terraform JSON log file with sections without saving to database."""
    if not file.filename.endswith(('.json', '.log')):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")

    content = await file.read()
    content_str = content.decode('utf-8')

    # Parse the log file with sections
    result = parse_terraform_log_with_sections(content_str, file.filename)

    if not result or not result.get('logs'):
        raise HTTPException(status_code=400, detail="No valid log entries found in the file")

    return result


@router.get("/logs", response_model=List[LogEntry])
def get_logs(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        level: Optional[str] = None,
        tf_resource_type: Optional[str] = None,
        start_timestamp: Optional[str] = None,
        end_timestamp: Optional[str] = None,
        tf_req_id: Optional[str] = None,
        tf_rpc: Optional[str] = None,
        message_contains: Optional[str] = None,
        db: Session = Depends(get_db)
):
    """Get logs from database with optional filtering."""
    if level:
        logs = get_logs_by_level(db, level)
    else:
        logs = get_all_logs(
            db,
            skip=skip,
            limit=limit,
            tf_resource_type=tf_resource_type,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp,
            tf_req_id=tf_req_id,
            tf_rpc=tf_rpc,
            message_contains=message_contains
        )

    return logs


@router.delete("/sessions", response_model=DeleteResponse)
def clear_session(db: Session = Depends(get_db)):
    """Clear all logs from the database (reset session)."""
    count = delete_all_logs(db)
    return DeleteResponse(
        message="Session cleared successfully",
        deleted_count=count
    )


@router.get("/gantt")
def get_gantt_chart_data(db: Session = Depends(get_db)):
    """Get aggregated request data for Gantt chart visualization."""
    data = get_gantt_data(db)
    return data


@router.get("/sections", response_model=LogWithSectionsResponse)
def get_sections_data(db: Session = Depends(get_db)):
    """Get sections data from database logs."""
    data = get_sections_from_db(db)
    return data
