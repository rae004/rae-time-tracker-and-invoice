"""Business logic for time entry operations."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models import CategoryTag, Project, TimeEntry


def utc_now() -> datetime:
    """Get current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)


def get_active_timer(session: Session) -> TimeEntry | None:
    """Get the currently running time entry (if any)."""
    return session.query(TimeEntry).filter(TimeEntry.end_time.is_(None)).first()


def start_timer(
    session: Session,
    project_id: UUID,
    name: str,
    tag_ids: list[UUID] | None = None,
    start_time: datetime | None = None,
) -> TimeEntry:
    """Start a new timer. Stops any existing running timer first."""
    # Stop any existing timer
    active = get_active_timer(session)
    if active:
        stop_timer(session, active)

    # Create new time entry
    entry = TimeEntry(
        project_id=project_id,
        name=name,
        start_time=start_time or utc_now(),
    )

    # Add tags if provided
    if tag_ids:
        tags = session.query(CategoryTag).filter(CategoryTag.id.in_(tag_ids)).all()
        entry.tags = tags

    session.add(entry)
    session.flush()
    return entry


def stop_timer(session: Session, entry: TimeEntry) -> TimeEntry:
    """Stop a running timer and calculate duration."""
    if entry.end_time is not None:
        return entry  # Already stopped

    now = utc_now()
    entry.end_time = now

    # Handle timezone-aware vs naive datetime comparison
    # (SQLite stores naive, PostgreSQL stores aware)
    start_time = entry.start_time
    if start_time.tzinfo is None and now.tzinfo is not None:
        # start_time is naive, now is aware - make now naive
        now = now.replace(tzinfo=None)
    elif start_time.tzinfo is not None and now.tzinfo is None:
        # start_time is aware, now is naive - make start_time naive
        start_time = start_time.replace(tzinfo=None)

    entry.duration_seconds = int((now - start_time).total_seconds())
    session.flush()
    return entry


def get_week_boundaries(reference_date: datetime | None = None) -> tuple[datetime, datetime]:
    """Get Saturday 00:00 to Friday 23:59:59 boundaries for the week containing reference_date.

    Week runs Saturday through Friday.
    """
    if reference_date is None:
        reference_date = utc_now()

    # Get the day of week (Monday = 0, Sunday = 6)
    day_of_week = reference_date.weekday()

    # Calculate days since Saturday
    # Saturday = 5, so if today is Saturday (5), days_since_saturday = 0
    # If today is Sunday (6), days_since_saturday = 1
    # If today is Monday (0), days_since_saturday = 2
    # etc.
    if day_of_week >= 5:  # Saturday or Sunday
        days_since_saturday = day_of_week - 5
    else:  # Monday through Friday
        days_since_saturday = day_of_week + 2

    # Week start (Saturday 00:00:00)
    week_start = reference_date.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = week_start - timedelta(days=days_since_saturday)

    # Week end (Friday 23:59:59.999999)
    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59, microseconds=999999)

    return week_start, week_end


def get_entries_for_week(
    session: Session,
    week_start: datetime,
    week_end: datetime,
    project_id: UUID | None = None,
) -> list[TimeEntry]:
    """Get all time entries for a specific week."""
    query = session.query(TimeEntry).filter(
        and_(
            TimeEntry.start_time >= week_start,
            TimeEntry.start_time <= week_end,
        )
    )

    if project_id:
        query = query.filter(TimeEntry.project_id == project_id)

    return query.order_by(TimeEntry.start_time.desc()).all()


def get_entries_grouped_by_day(
    entries: list[TimeEntry],
) -> dict[str, list[TimeEntry]]:
    """Group entries by date string (YYYY-MM-DD)."""
    grouped: dict[str, list[TimeEntry]] = {}

    for entry in entries:
        date_str = entry.start_time.strftime("%Y-%m-%d")
        if date_str not in grouped:
            grouped[date_str] = []
        grouped[date_str].append(entry)

    return grouped


def calculate_daily_totals(grouped_entries: dict[str, list[TimeEntry]]) -> dict[str, float]:
    """Calculate total hours for each day."""
    totals: dict[str, float] = {}

    for date_str, entries in grouped_entries.items():
        total_seconds = sum(
            (e.duration_seconds or 0) for e in entries if e.duration_seconds is not None
        )
        # For running timers, calculate current duration
        for entry in entries:
            if entry.end_time is None:
                now = utc_now()
                start_time = entry.start_time
                # Handle timezone-aware vs naive datetime comparison
                if start_time.tzinfo is None and now.tzinfo is not None:
                    now = now.replace(tzinfo=None)
                elif start_time.tzinfo is not None and now.tzinfo is None:
                    start_time = start_time.replace(tzinfo=None)
                running_seconds = int((now - start_time).total_seconds())
                total_seconds += running_seconds

        totals[date_str] = round(total_seconds / 3600, 2)

    return totals


def calculate_weekly_total(daily_totals: dict[str, float]) -> float:
    """Calculate total hours for the week."""
    return round(sum(daily_totals.values()), 2)
