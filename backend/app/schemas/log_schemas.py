from datetime import datetime
from typing import Optional, Any, List

from pydantic import BaseModel


class LogEntry(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    log_level: Optional[str] = None
    timestamp: Optional[str] = None
    message: Optional[str] = None
    caller: Optional[str] = None
    module: Optional[str] = None
    tf_provider_addr: Optional[str] = None
    tf_req_id: Optional[str] = None
    tf_resource_type: Optional[str] = None
    tf_rpc: Optional[str] = None
    raw_data: Optional[Any] = None

    class Config:
        from_attributes = True


class LogUploadResponse(BaseModel):
    message: str
    entries_count: int
    filename: str


class SectionInfo(BaseModel):
    type: str
    start_index: int
    end_index: int
    log_count: int
    start_timestamp: Optional[str] = None
    end_timestamp: Optional[str] = None


class LogWithSectionsResponse(BaseModel):
    logs: List[dict]
    sections: List[SectionInfo]
    filename: str
    total_logs: int


class DeleteResponse(BaseModel):
    message: str
    deleted_count: int
