import json
from typing import List

from sqlalchemy.orm import Session

from app.models import TerraformLog


def parse_terraform_log(content: str, filename: str) -> List[dict]:
    """Parse Terraform JSON log file."""
    logs = []

    # Try to parse as JSON array first
    try:
        data = json.loads(content)
        if isinstance(data, list):
            logs = data
        elif isinstance(data, dict):
            logs = [data]
    except json.JSONDecodeError:
        # Try parsing line by line (JSONL format)
        for line in content.strip().split('\n'):
            if line.strip():
                try:
                    log_entry = json.loads(line)
                    logs.append(log_entry)
                except json.JSONDecodeError:
                    continue

    return logs


def save_logs_to_db(db: Session, logs: List[dict], filename: str) -> int:
    """Save parsed logs to database."""
    count = 0
    for log in logs:
        # Extract additional fields
        tf_req_id = log.get('tf_req_id')
        tf_resource = log.get('tf_resource')
        tf_resource_type = tf_resource.get('type') if isinstance(tf_resource, dict) else None

        log_entry = TerraformLog(
            filename=filename,
            log_level=log.get('@level') or log.get('level'),
            timestamp=log.get('@timestamp') or log.get('timestamp'),
            message=log.get('@message') or log.get('message'),
            tf_req_id=tf_req_id,
            tf_resource_type=tf_resource_type,
            raw_data=log
        )
        db.add(log_entry)
        count += 1

    db.commit()
    return count


def get_all_logs(db: Session, skip: int = 0, limit: int = 100):
    """Get all logs from database."""
    return db.query(TerraformLog).order_by(TerraformLog.uploaded_at.desc()).offset(skip).limit(limit).all()


def get_logs_by_level(db: Session, level: str):
    """Get logs filtered by level."""
    return db.query(TerraformLog).filter(TerraformLog.log_level == level).order_by(
        TerraformLog.uploaded_at.desc()).all()


def search_logs(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        level: str = None,
        tf_resource_type: str = None,
        timestamp_from: str = None,
        timestamp_to: str = None,
        group_by: str = None,
        search_query: str = None
):
    """Search logs with multiple filters and grouping."""
    query = db.query(TerraformLog)

    filters = []
    if level:
        filters.append(TerraformLog.log_level == level)
    if tf_resource_type:
        filters.append(TerraformLog.tf_resource_type == tf_resource_type)
    if timestamp_from:
        filters.append(TerraformLog.timestamp >= timestamp_from)
    if timestamp_to:
        filters.append(TerraformLog.timestamp <= timestamp_to)
    if search_query:
        filters.append(TerraformLog.message.ilike(f"%{search_query}%"))

    if filters:
        query = query.filter(*filters)

    if group_by == "tf_req_id":
        query = query.group_by(TerraformLog.tf_req_id)

    return query.offset(skip).limit(limit).all()
