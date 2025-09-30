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
    raw_data = Column(JSON)
