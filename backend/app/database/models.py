from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    telegram_id = Column(BigInteger, unique=True, nullable=False, index=True)
    first_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)
    language_code = Column(String(10), nullable=True)
    photo_url = Column(String(1000), nullable=True)
    role = Column(String(20), default="student", nullable=False)  # student | teacher
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    submissions = relationship(
        "CaseSubmission", back_populates="user", cascade="all, delete-orphan"
    )
    enrollments = relationship(
        "GroupEnrollment", back_populates="user", cascade="all, delete-orphan"
    )


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    enrollments = relationship(
        "GroupEnrollment", back_populates="group", cascade="all, delete-orphan"
    )
    assignments = relationship(
        "CaseAssignment", back_populates="group", cascade="all, delete-orphan"
    )


class GroupEnrollment(Base):
    __tablename__ = "group_enrollments"

    id = Column(Integer, primary_key=True)
    group_id = Column(
        Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    group = relationship("Group", back_populates="enrollments")
    user = relationship("User", back_populates="enrollments")

    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_group_user"),)


class STEMCase(Base):
    __tablename__ = "stem_cases"

    id = Column(Integer, primary_key=True)
    title_kk = Column(String(500), nullable=False)
    objective_kk = Column(Text, nullable=True)        # мақсаты
    situation_kk = Column(Text, nullable=True)        # жағдаят
    theory_kk = Column(Text, nullable=True)           # теориялық түсінік
    cover_image_url = Column(String(1000), nullable=True)
    equipment = Column(JSON, nullable=True, default=list)  # [{name, qty, purpose}]
    subject = Column(String(50), nullable=False, index=True)
    difficulty = Column(String(20), nullable=False, default="medium")
    age_range = Column(String(20), nullable=True)
    tags = Column(JSON, nullable=True, default=list)
    is_published = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    blocks = relationship(
        "CaseBlock",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="CaseBlock.position",
    )
    videos = relationship(
        "CaseVideo",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="CaseVideo.position",
    )
    tasks = relationship(
        "CaseTask",
        back_populates="case",
        cascade="all, delete-orphan",
        order_by="CaseTask.position",
    )
    assignments = relationship(
        "CaseAssignment", back_populates="case", cascade="all, delete-orphan"
    )


class CaseBlock(Base):
    __tablename__ = "case_blocks"

    id = Column(Integer, primary_key=True)
    case_id = Column(
        Integer,
        ForeignKey("stem_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position = Column(Integer, default=0, nullable=False)
    # text | formula | image | video | equipment | safety | divider | task
    type = Column(String(20), nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("STEMCase", back_populates="blocks")


class CaseVideo(Base):
    __tablename__ = "case_videos"

    id = Column(Integer, primary_key=True)
    case_id = Column(
        Integer,
        ForeignKey("stem_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = Column(String(20), nullable=False, default="youtube")  # youtube | mp4
    external_id_or_url = Column(String(1000), nullable=False)
    title_kk = Column(String(500), nullable=True)
    duration_sec = Column(Integer, nullable=True)
    position = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("STEMCase", back_populates="videos")


class CaseTask(Base):
    __tablename__ = "case_tasks"

    id = Column(Integer, primary_key=True)
    case_id = Column(
        Integer,
        ForeignKey("stem_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    position = Column(Integer, default=0, nullable=False)
    prompt_kk = Column(Text, nullable=False)
    # open_text | numeric | multiple_choice | file_upload
    type = Column(String(20), nullable=False)
    options = Column(JSON, nullable=True)         # MCQ choices
    expected_answer = Column(JSON, nullable=True)  # auto-grading reference
    tolerance = Column(Float, nullable=True)       # numeric ± tolerance
    points = Column(Float, default=1.0, nullable=False)
    rubric_kk = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("STEMCase", back_populates="tasks")
    answers = relationship(
        "TaskAnswer", back_populates="task", cascade="all, delete-orphan"
    )


class CaseSubmission(Base):
    __tablename__ = "case_submissions"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    case_id = Column(
        Integer,
        ForeignKey("stem_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        String(20), default="in_progress", nullable=False
    )  # in_progress | submitted | graded
    total_score = Column(Float, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    graded_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="submissions")
    case = relationship("STEMCase")
    answers = relationship(
        "TaskAnswer", back_populates="submission", cascade="all, delete-orphan"
    )


class TaskAnswer(Base):
    __tablename__ = "task_answers"

    id = Column(Integer, primary_key=True)
    submission_id = Column(
        Integer,
        ForeignKey("case_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id = Column(
        Integer,
        ForeignKey("case_tasks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    payload = Column(JSON, nullable=False, default=dict)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    auto_graded = Column(Boolean, default=False, nullable=False)
    answered_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    submission = relationship("CaseSubmission", back_populates="answers")
    task = relationship("CaseTask", back_populates="answers")

    __table_args__ = (
        UniqueConstraint("submission_id", "task_id", name="uq_submission_task"),
    )


class CaseAssignment(Base):
    """Teacher assigns a case to a group, optionally with a deadline."""

    __tablename__ = "case_assignments"

    id = Column(Integer, primary_key=True)
    case_id = Column(
        Integer,
        ForeignKey("stem_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    group_id = Column(
        Integer,
        ForeignKey("groups.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    due_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    case = relationship("STEMCase", back_populates="assignments")
    group = relationship("Group", back_populates="assignments")


class TeacherFeedback(Base):
    __tablename__ = "teacher_feedback"

    id = Column(Integer, primary_key=True)
    submission_id = Column(
        Integer,
        ForeignKey("case_submissions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    teacher_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=True)
    delivered = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class BroadcastLog(Base):
    __tablename__ = "broadcast_log"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    group_ids = Column(JSON, nullable=True)
    text = Column(Text, nullable=False)
    sent_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
