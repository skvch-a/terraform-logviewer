import json
from enum import Enum

from sqlalchemy.orm import Session

from app.models import TerraformLog


class SectionType(Enum):
    """Типы секций Terraform."""
    PLAN = "plan"
    APPLY = "apply"
    INIT = "init"
    OTHER = "other"


class LogSection:
    """Представление секции лога."""

    def __init__(self, section_type: SectionType, start_index: int):
        self.section_type = section_type
        self.start_index = start_index
        self.end_index: int | None = None
        self.logs: list[dict] = []


def detect_section_markers(log_entry: dict) -> tuple[str | None, str | None]:
    """
    Определяет маркеры начала и конца секций.

    Возвращает: (start_marker, end_marker)
    - start_marker: тип секции, если это начало ("plan", "apply", "init")
    - end_marker: тип секции, если это конец
    """
    message = log_entry.get('@message', '') or log_entry.get('message', '')
    log_type = log_entry.get('type', '')

    # Маркеры начала секций
    if 'backend/local: starting Plan operation' in message:
        return 'plan', None
    elif 'backend/local: starting Apply operation' in message:
        return 'apply', None
    elif 'Initializing the backend' in message or 'Initializing provider plugins' in message:
        return 'init', None

    # Маркеры конца секций
    if log_type == 'change_summary' or 'Plan:' in message:
        return None, 'plan'
    elif log_type == 'apply_complete' or 'Apply complete!' in message:
        return None, 'apply'
    elif 'Terraform has been successfully initialized' in message:
        return None, 'init'

    return None, None


def parse_terraform_log_with_sections(content: str, filename: str) -> dict:
    """
    Парсит Terraform JSON лог с выделением секций.

    Возвращает словарь с информацией о секциях и логах.
    """
    logs = parse_terraform_log(content)

    # Анализ секций
    sections = []
    current_section: LogSection | None = None

    for idx, log_entry in enumerate(logs):
        start_marker, end_marker = detect_section_markers(log_entry)

        # Начало новой секции
        if start_marker:
            # Закрываем предыдущую секцию, если была открыта
            if current_section and current_section.end_index is None:
                current_section.end_index = idx - 1
                sections.append(current_section)

            # Создаем новую секцию
            section_type = SectionType(start_marker)
            current_section = LogSection(section_type, idx)
            current_section.logs.append(log_entry)

        # Конец текущей секции
        elif end_marker and current_section:
            if current_section.section_type.value == end_marker:
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
        'total_logs': len(logs)
    }


def parse_terraform_log(content: str) -> list[dict]:
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


def save_logs_to_db(db: Session, logs: list[dict], filename: str) -> int:
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
