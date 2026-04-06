"""Pydantic schemas for Rae Time Tracker API."""

from app.schemas.category_tag import (
    CategoryTagCreate,
    CategoryTagListResponse,
    CategoryTagResponse,
    CategoryTagUpdate,
)
from app.schemas.client import (
    ClientCreate,
    ClientListResponse,
    ClientResponse,
    ClientUpdate,
)
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceLineItemCreate,
    InvoiceLineItemResponse,
    InvoiceListResponse,
    InvoicePreviewRequest,
    InvoicePreviewResponse,
    InvoiceResponse,
    InvoiceUpdate,
    InvoiceWithClientResponse,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
    ProjectWithClientResponse,
)
from app.schemas.time_entry import (
    ActiveTimerResponse,
    TimeEntryCreate,
    TimeEntryListResponse,
    TimeEntryResponse,
    TimeEntryUpdate,
    TimeEntryWithProjectResponse,
    WeeklyEntriesResponse,
)
from app.schemas.user_profile import (
    UserProfileCreate,
    UserProfileResponse,
    UserProfileUpdate,
)

__all__ = [
    # Category Tags
    "CategoryTagCreate",
    "CategoryTagListResponse",
    "CategoryTagResponse",
    "CategoryTagUpdate",
    # Clients
    "ClientCreate",
    "ClientListResponse",
    "ClientResponse",
    "ClientUpdate",
    # Invoices
    "InvoiceCreate",
    "InvoiceLineItemCreate",
    "InvoiceLineItemResponse",
    "InvoiceListResponse",
    "InvoicePreviewRequest",
    "InvoicePreviewResponse",
    "InvoiceResponse",
    "InvoiceUpdate",
    "InvoiceWithClientResponse",
    # Projects
    "ProjectCreate",
    "ProjectListResponse",
    "ProjectResponse",
    "ProjectUpdate",
    "ProjectWithClientResponse",
    # Time Entries
    "ActiveTimerResponse",
    "TimeEntryCreate",
    "TimeEntryListResponse",
    "TimeEntryResponse",
    "TimeEntryUpdate",
    "TimeEntryWithProjectResponse",
    "WeeklyEntriesResponse",
    # User Profile
    "UserProfileCreate",
    "UserProfileResponse",
    "UserProfileUpdate",
]
