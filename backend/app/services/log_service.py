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
        log_entry = TerraformLog(
            filename=filename,
            log_level=log.get('@level') or log.get('level'),
            timestamp=log.get('@timestamp') or log.get('timestamp'),
            message=log.get('@message') or log.get('message'),
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
