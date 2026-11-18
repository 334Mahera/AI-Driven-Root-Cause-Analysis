
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(Integer, primary_key=True, index=True)

    # Basic incident information
    incident_id = Column(String(100), unique=True, index=True)
    product_name = Column(String(200))
    batch_number = Column(String(100))
    equipment = Column(String(200))
    incident_type = Column(String(200))
    description = Column(Text)
    expected_value = Column(String(100))
    actual_value = Column(String(100))

    # AI-generated RCA results
    five_whys = Column(JSON, nullable=True)
    fishbone = Column(JSON, nullable=True)
    potential_causes = Column(JSON, nullable=True)
    missing_evidence = Column(JSON, nullable=True)
    capa_recommendations = Column(JSON, nullable=True)

    # Human review and approval
    status = Column(String(50), default="Draft")
    reviewer_name = Column(String(150), nullable=True)
    review_comments = Column(Text, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    committed_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        onupdate=func.now()
    )

    # Relationships
    evidences = relationship(
        "Evidence",
        back_populates="investigation",
        cascade="all, delete-orphan"
    )

    root_causes = relationship(
        "RootCause",
        back_populates="investigation",
        cascade="all, delete-orphan"
    )

    capa_actions = relationship(
        "CAPAAction",
        back_populates="investigation",
        cascade="all, delete-orphan"
    )

    audit_logs = relationship(
        "AuditLog",
        back_populates="investigation",
        cascade="all, delete-orphan"
    )


class Evidence(Base):
    __tablename__ = "evidences"

    id = Column(Integer, primary_key=True, index=True)

    investigation_id = Column(
        Integer,
        ForeignKey("investigations.id")
    )

    file_name = Column(String(255))
    file_type = Column(String(100))
    extracted_text = Column(Text)

    investigation = relationship(
        "Investigation",
        back_populates="evidences"
    )


class RootCause(Base):
    __tablename__ = "root_causes"

    id = Column(Integer, primary_key=True, index=True)

    investigation_id = Column(
        Integer,
        ForeignKey("investigations.id")
    )

    analysis_method = Column(String(50), default="5 Whys")
    why_analysis = Column(Text)
    identified_cause = Column(Text)
    supporting_evidence = Column(Text)
    confidence = Column(String(50))

    verification_status = Column(
        String(50),
        default="Pending Verification"
    )

    investigation = relationship(
        "Investigation",
        back_populates="root_causes"
    )


class CAPAAction(Base):
    __tablename__ = "capa_actions"

    id = Column(Integer, primary_key=True, index=True)

    investigation_id = Column(
        Integer,
        ForeignKey("investigations.id")
    )

    action_type = Column(String(50))
    description = Column(Text)
    assigned_to = Column(String(150))
    due_date = Column(String(50))
    status = Column(String(50), default="Pending")

    investigation = relationship(
        "Investigation",
        back_populates="capa_actions"
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    investigation_id = Column(
        Integer,
        ForeignKey("investigations.id")
    )

    action = Column(String(200))
    details = Column(Text)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    investigation = relationship(
        "Investigation",
        back_populates="audit_logs"
    )
