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
    caller = Column(String, nullable=True)
    module = Column(String, nullable=True)
    tf_provider_addr = Column(String, nullable=True)
    tf_req_id = Column(String, nullable=True)
    tf_resource_type = Column(String, nullable=True)
    tf_rpc = Column(String, nullable=True)
    raw_data = Column(JSON)
