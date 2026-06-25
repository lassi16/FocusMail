from sqlalchemy import BigInteger, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Text, DateTime, BigInteger

Base = declarative_base()


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True)

    gmail_id = Column(String, unique=True)

    sender = Column(String)

    subject = Column(String)

    body = Column(Text)

    category = Column(String)

    priority = Column(String)

    action_item = Column(Text, nullable=True)

    deadline = Column(String, nullable=True)

    received_at = Column(DateTime, nullable=True)

    gmail_internal_date = Column(BigInteger, nullable=True)
