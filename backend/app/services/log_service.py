import json
from enum import Enum

from sqlalchemy.orm import Session

from app.models import TerraformLog
from app.services.log_fixing import fix_log_sequence


class SectionType(Enum):
    """Типы секций Terraform."""
    PLAN = "plan"
    APPLY = "apply"
    INIT = "init"


class LogSection:
    """Представление секции лога."""

    def __init__(self, section_type: SectionType, start_index: int):
        self.section_type = section_type
        self.start_index = start_index
        self.end_index: int | None = None
        self.logs: list[dict] = []


def detect_section_markers(log_entry: dict) -> tuple[SectionType | None, SectionType | None]:
    message = log_entry.get('@message', '') or log_entry.get('message', '')
    log_type = log_entry.get('type', '')

    return detect_section_start(message), detect_section_end(log_type, message)


def detect_section_start(message: str) -> SectionType | None:
    if 'backend/local: starting Plan operation' in message:
        return SectionType.PLAN
    elif 'backend/local: starting Apply operation' in message:
        return SectionType.APPLY
    elif 'Initializing the backend' in message or 'Initializing provider plugins' in message:
        return SectionType.INIT
    return None


def detect_section_end(log_type: str, message: str) -> SectionType | None:
    if log_type == 'change_summary' or 'Plan:' in message:
        return SectionType.PLAN
    elif log_type == 'apply_complete' or 'Apply complete!' in message:
        return SectionType.APPLY
    elif 'Terraform has been successfully initialized' in message:
        return SectionType.INIT
    return None


def parse_terraform_log_with_sections(content: str, filename: str) -> dict:
    """
    Парсит Terraform JSON лог с выделением секций.

    Возвращает словарь с информацией о секциях и логах.
    """
    logs, fixed_count = parse_terraform_log(content)

    # Анализ секций
    sections = []
    current_section: LogSection | None = None

    for idx, log_entry in enumerate(logs):
        start_section, end_section = detect_section_markers(log_entry)

        # Начало новой секции
        if start_section:
            # Закрываем предыдущую секцию, если была открыта
            if current_section and current_section.end_index is None:
                current_section.end_index = idx - 1
                sections.append(current_section)

            current_section = LogSection(start_section, idx)
            current_section.logs.append(log_entry)

        # Конец текущей секции
        elif end_section and current_section:
            if current_section.section_type.value == end_section.value:
                current_section.logs.append(log_entry)
                current_section.end_index = idx
                sections.append(current_section)
                current_section = None

        # Продолжение текущей секции
        elif current_section:
            current_section.logs.append(log_entry)

    # Закрываем последнюю секцию, если осталась открытой
    if current_section and current_section.end_index is None:
        current_section.end_index = len(logs) - 1
        sections.append(current_section)

    return {
        'logs': logs,
        'sections': [
            {
                'type': section.section_type.value,
                'start_index': section.start_index,
                'end_index': section.end_index,
                'log_count': len(section.logs),
                'start_timestamp': section.logs[0].get('@timestamp') or section.logs[0].get(
                    'timestamp') if section.logs else None,
                'end_timestamp': section.logs[-1].get('@timestamp') or section.logs[-1].get(
                    'timestamp') if section.logs else None
            }
            for section in sections
        ],
        'filename': filename,
        'total_logs': len(logs),
        'fixed_logs_count': fixed_count
    }


def parse_terraform_log(content: str) -> tuple[list[dict], int]:
    """
    Parse Terraform JSON log file.
    
    Returns:
        tuple: (parsed_logs, count_of_fixed_entries)
    """
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

    return fix_log_sequence(logs)


def save_logs_to_db(db: Session, logs: list[dict], filename: str) -> int:
    """Save parsed logs to database."""
    count = 0
    for log in logs:
        log_entry = TerraformLog(
            filename=filename,
            log_level=log.get('@level') or log.get('level'),
            timestamp=log.get('@timestamp') or log.get('timestamp'),
            message=log.get('@message') or log.get('message'),
            caller=log.get('@caller'),
            module=log.get('@module'),
            tf_provider_addr=log.get('tf_provider_addr'),
            tf_req_id=log.get('tf_req_id'),
            tf_resource_type=log.get('tf_resource_type'),
            tf_rpc=log.get('tf_rpc'),
            raw_data=log
        )
        db.add(log_entry)
        count += 1

    db.commit()
    return count


def get_all_logs(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        tf_resource_type: str | None = None,
        start_timestamp: str | None = None,
        end_timestamp: str | None = None,
        tf_req_id: str | None = None,
        tf_rpc: str | None = None,
        message_contains: str | None = None
):
    """Get all logs from database with optional filtering."""
    query = db.query(TerraformLog)

    if tf_resource_type:
        query = query.filter(TerraformLog.tf_resource_type == tf_resource_type)
    if start_timestamp:
        query = query.filter(TerraformLog.timestamp >= start_timestamp)
    if end_timestamp:
        query = query.filter(TerraformLog.timestamp <= end_timestamp)
    if tf_req_id:
        query = query.filter(TerraformLog.tf_req_id == tf_req_id)
    if tf_rpc:
        query = query.filter(TerraformLog.tf_rpc == tf_rpc)
    if message_contains:
        query = query.filter(TerraformLog.message.contains(message_contains))

    return query.order_by(TerraformLog.tf_req_id).offset(skip).limit(limit).all()


def get_logs_by_level(db: Session, level: str):
    """Get logs filtered by level."""
    return db.query(TerraformLog).filter(TerraformLog.log_level == level).order_by(
        TerraformLog.uploaded_at.desc()).all()


def delete_all_logs(db: Session) -> int:
    """Delete all logs from database. Returns count of deleted logs."""
    count = db.query(TerraformLog).count()
    db.query(TerraformLog).delete()
    db.commit()
    return count


def get_gantt_data(db: Session) -> list[dict]:
    """
    Get aggregated request data for Gantt chart visualization.
    Groups logs by tf_req_id and calculates start/end timestamps.
    Optimized: no full log storage, no per-group sorting.
    """
    logs_with_req_id = (
        db.query(TerraformLog)
        .filter(TerraformLog.tf_req_id.isnot(None))
        .order_by(TerraformLog.timestamp)
        .all()
    )

    requests_data = {}
    for log in logs_with_req_id:
        req_id = log.tf_req_id
        if req_id not in requests_data:
            requests_data[req_id] = {
                'tf_req_id': req_id,
                'tf_rpc': log.tf_rpc,
                'tf_resource_type': log.tf_resource_type,
                'start_timestamp': log.timestamp,
                'end_timestamp': log.timestamp,
                'log_count': 1,
            }
        else:
            data = requests_data[req_id]

            if log.timestamp and (not data['start_timestamp'] or log.timestamp < data['start_timestamp']):
                data['start_timestamp'] = log.timestamp
            if log.timestamp and (not data['end_timestamp'] or log.timestamp > data['end_timestamp']):
                data['end_timestamp'] = log.timestamp
            data['log_count'] += 1

            if not data['tf_rpc'] and log.tf_rpc:
                data['tf_rpc'] = log.tf_rpc
            if not data['tf_resource_type'] and log.tf_resource_type:
                data['tf_resource_type'] = log.tf_resource_type

    gantt_data = list(requests_data.values())
    gantt_data.sort(key=lambda x: x['start_timestamp'] or '')

    return gantt_data


def get_sections_from_db(db: Session) -> dict:
    """
    Get sections data from database logs.
    Similar to parse_terraform_log_with_sections but works from DB.
    """
    # Get all logs from database
    logs_query = db.query(TerraformLog).order_by(TerraformLog.id).all()
    
    if not logs_query:
        return {
            'logs': [],
            'sections': [],
            'filename': '',
            'total_logs': 0,
            'fixed_logs_count': 0
        }
    
    # Convert DB logs to dict format similar to JSON logs
    logs = []
    for log in logs_query:
        log_dict = {
            '@level': log.log_level,
            '@timestamp': log.timestamp,
            '@message': log.message,
            'level': log.log_level,
            'timestamp': log.timestamp,
            'message': log.message,
        }
        # Add raw_data if available
        if log.raw_data:
            log_dict.update(log.raw_data)
        logs.append(log_dict)
    
    # Analyze sections using the same logic as parse_terraform_log_with_sections
    sections = []
    current_section: LogSection | None = None

    for idx, log_entry in enumerate(logs):
        start_section, end_section = detect_section_markers(log_entry)

        # Start of new section
        if start_section:
            # Close previous section if open
            if current_section and current_section.end_index is None:
                current_section.end_index = idx - 1
                sections.append(current_section)

            current_section = LogSection(start_section, idx)
            current_section.logs.append(log_entry)

        # End of current section
        elif end_section and current_section:
            if current_section.section_type.value == end_section.value:
                current_section.logs.append(log_entry)
                current_section.end_index = idx
                sections.append(current_section)
                current_section = None

        # Continue current section
        elif current_section:
            current_section.logs.append(log_entry)

    # Close last section if still open
    if current_section and current_section.end_index is None:
        current_section.end_index = len(logs) - 1
        sections.append(current_section)

    # Get filename from first log
    filename = logs_query[0].filename if logs_query else ''

    return {
        'logs': logs,
        'sections': [
            {
                'type': section.section_type.value,
                'start_index': section.start_index,
                'end_index': section.end_index,
                'log_count': len(section.logs),
                'start_timestamp': section.logs[0].get('@timestamp') or section.logs[0].get(
                    'timestamp') if section.logs else None,
                'end_timestamp': section.logs[-1].get('@timestamp') or section.logs[-1].get(
                    'timestamp') if section.logs else None
            }
            for section in sections
        ],
        'filename': filename,
        'total_logs': len(logs),
        'fixed_logs_count': 0  # DB logs are already processed
    }

