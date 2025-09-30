from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, JSON

from app.database import Base


class TerraformLog(Base):
    __tablename__ = "terraform_logs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    log_level = Column(String, index=True)
    timestamp = Column(String)
    message = Column(Text)
    tf_req_id = Column(String, index=True, nullable=True)  # Add request ID
    tf_resource_type = Column(String, index=True, nullable=True)  # Add resource type
    raw_data = Column(JSON)
