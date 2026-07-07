from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    BigInteger,
    Date,
    ForeignKey,
    Boolean
)

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    
    email = Column(String, unique=True, index=True, nullable=False)
    
    password_hash = Column(String, nullable=False)
    
    first_name = Column(String, nullable=True)
    
    last_name = Column(String, nullable=True)
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    
    # One User -> Many UserEmails
    user_emails = relationship(
        "UserEmail",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    # One User -> Many Emails
    emails = relationship(
        "Email",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class UserEmail(Base):
    __tablename__ = "user_emails"

    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    email = Column(String, nullable=False, index=True)
    
    provider = Column(String, nullable=False)  # "gmail", "outlook", etc.
    
    refresh_token = Column(Text, nullable=True)
    
    access_token = Column(Text, nullable=True)
    
    is_connected = Column(Boolean, default=False)
    
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )
    
    # Many UserEmails -> One User
    user = relationship(
        "User",
        back_populates="user_emails"
    )


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    gmail_id = Column(String, unique=True, index=True)

    sender = Column(String)

    subject = Column(Text)

    body = Column(Text)

    category = Column(String)

    priority = Column(String)

    # Temporary (will be removed after migration)
    action_item = Column(Text)

    # Temporary (will be removed after migration)
    deadline = Column(String)

    gmail_internal_date = Column(BigInteger)

    received_at = Column(DateTime(timezone=True))

    # One Email -> Many Events
    events = relationship(
        "EmailEvent",
        back_populates="email",
        cascade="all, delete-orphan"
    )
    
    # Many Emails -> One User
    user = relationship(
        "User",
        back_populates="emails"
    )


class EmailEvent(Base):
    __tablename__ = "email_events"

    id = Column(Integer, primary_key=True, index=True)

    email_id = Column(
        Integer,
        ForeignKey("emails.id", ondelete="CASCADE"),
        nullable=False
    )

    # meeting, assignment, interview,
    # application_deadline, bill, exam, etc.
    event_type = Column(String(100), nullable=False)

    # Short title
    title = Column(Text)

    # Optional detailed description
    description = Column(Text)

    # Date of the event
    event_date = Column(Date)

    # Time (optional)
    event_time = Column(String(50))

    # High / Medium / Low
    priority = Column(String(20))

    # pending / completed / cancelled
    status = Column(
        String(20),
        default="pending"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    # Many Events -> One Email
    email = relationship(
        "Email",
        back_populates="events"
    )