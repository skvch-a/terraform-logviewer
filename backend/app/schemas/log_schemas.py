from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel


class LogEntry(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    log_level: Optional[str] = None
    timestamp: Optional[str] = None
    message: Optional[str] = None
    tf_req_id: Optional[str] = None
    tf_resource_type: Optional[str] = None
    raw_data: Optional[Any] = None

    class Config:
        from_attributes = True


class LogUploadResponse(BaseModel):
    message: str
    entries_count: int
    filename: str
