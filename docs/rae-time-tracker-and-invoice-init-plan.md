# Rae Time Tracker & Invoice - Implementation Plan

## Overview

A single-user time tracking application with invoice generation capabilities, built using the `/rae-scaffold-crud-app` skill's prescribed tech stack.

### Tech Stack (from rae-scaffold-crud-app)
- **Backend**: Flask 3.x, SQLAlchemy 2.x, Pydantic 2.x, PostgreSQL 17, pytest
- **Frontend**: React 19, TypeScript 5.6, Vite, TailwindCSS 4, DaisyUI 5, React Query 5
- **Infrastructure**: Docker Compose, GitHub Actions CI

### Key Requirements
- Start/stop time tracking with named entries
- Weekly view (Saturday 00:00 - Friday 23:59) with totals
- Category tags for entries
- Editable entries (name, time, tags)
- Admin settings for clients, tags, profile
- PDF invoice generation matching existing invoice style

---

## Phase 1: Project Scaffold & Core Data Models

**Goal**: Set up the project foundation and define all domain models.

### 1.1 Scaffold Project
Use `/rae-scaffold-crud-app` to create the base project:
- Project name: "Rae Time Tracker"
- Target directory: `/Users/rae004/projects/Personal/rae-time-tracker-and-invoice`

### 1.2 Domain Models

**Client** (`backend/app/models/client.py`)
```
- id: UUID (PK)
- name: str
- address_line1: str
- address_line2: str (optional)
- city: str
- state: str
- zip_code: str
- phone: str (optional)
- hourly_rate: Decimal
- service_description: str (default: "Software development services")
- created_at: datetime
- updated_at: datetime
```

**Project** (`backend/app/models/project.py`)
```
- id: UUID (PK)
- client_id: UUID (FK -> Client)
- name: str
- description: str (optional)
- is_active: bool (default: true)
- created_at: datetime
- updated_at: datetime
```

**CategoryTag** (`backend/app/models/category_tag.py`)
```
- id: UUID (PK)
- name: str (unique)
- color: str (hex color for UI)
- created_at: datetime
```

**TimeEntry** (`backend/app/models/time_entry.py`)
```
- id: UUID (PK)
- project_id: UUID (FK -> Project)
- name: str (work description)
- start_time: datetime
- end_time: datetime (nullable - null means timer running)
- duration_seconds: int (computed or stored)
- created_at: datetime
- updated_at: datetime
```

**TimeEntryTag** (`backend/app/models/time_entry_tag.py`) - Join table
```
- time_entry_id: UUID (FK)
- category_tag_id: UUID (FK)
```

**UserProfile** (`backend/app/models/user_profile.py`) - Single row for contractor info
```
- id: UUID (PK)
- name: str
- address_line1: str
- address_line2: str (optional)
- city: str
- state: str
- zip_code: str
- email: str
- phone: str
- payment_instructions: str
- next_invoice_number: int (auto-increment tracking)
- created_at: datetime
- updated_at: datetime
```

**Invoice** (`backend/app/models/invoice.py`)
```
- id: UUID (PK)
- invoice_number: int
- client_id: UUID (FK -> Client)
- period_start: date
- period_end: date
- hourly_rate: Decimal (snapshot from client)
- subtotal: Decimal
- tax_rate: Decimal (default: 0)
- other_charges: Decimal (default: 0)
- total: Decimal
- status: enum (draft, finalized)
- pdf_path: str (nullable)
- created_at: datetime
```

**InvoiceLineItem** (`backend/app/models/invoice_line_item.py`)
```
- id: UUID (PK)
- invoice_id: UUID (FK -> Invoice)
- time_entry_id: UUID (FK -> TimeEntry, nullable - for reference)
- project_name: str (snapshot)
- work_date: date
- hours: Decimal
- amount: Decimal
- sort_order: int
```

### 1.3 API Endpoints (Phase 1)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients` | GET, POST | List/create clients |
| `/api/clients/:id` | GET, PUT, DELETE | Client CRUD |
| `/api/projects` | GET, POST | List/create projects |
| `/api/projects/:id` | GET, PUT, DELETE | Project CRUD |
| `/api/category-tags` | GET, POST | List/create tags |
| `/api/category-tags/:id` | GET, PUT, DELETE | Tag CRUD |
| `/api/user-profile` | GET, PUT | Get/update user profile |

### 1.4 Database Migrations
- Create initial migration with all models
- Seed UserProfile with placeholder data

### Files to Create/Modify
- `backend/app/models/` - All model files
- `backend/app/schemas/` - Pydantic schemas for each model
- `backend/app/routes/` - Blueprint files for each resource
- `backend/app/services/` - Business logic services
- `backend/tests/` - Tests for each endpoint

---

## Phase 2: Time Tracking Core

**Goal**: Implement the timer functionality and time entry management.

### 2.1 Time Entry API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/time-entries` | GET | List entries (with filters) |
| `/api/time-entries` | POST | Create entry (manual or start timer) |
| `/api/time-entries/:id` | GET, PUT, DELETE | Entry CRUD |
| `/api/time-entries/:id/stop` | POST | Stop running timer |
| `/api/time-entries/active` | GET | Get currently running entry |
| `/api/time-entries/weekly` | GET | Get entries grouped by week |

### 2.2 Frontend Pages

**Time Tracker Page** (`frontend/src/pages/TimeTracker.tsx`)
- Active timer display with start/stop button
- Project selector dropdown
- Entry name input
- Tag multi-select
- Real-time duration counter when timer running

**Weekly View Component** (`frontend/src/components/WeeklyView.tsx`)
- Week navigation (prev/next)
- Entries grouped by day
- Daily subtotals
- Weekly total
- Saturday-Friday week boundaries

**Time Entry Card** (`frontend/src/components/TimeEntryCard.tsx`)
- Display entry name, project, duration, tags
- Edit button → inline editing or modal
- Delete button with confirmation

### 2.3 Frontend Hooks
- `useTimeEntries()` - Fetch and cache entries
- `useActiveTimer()` - Poll for active timer
- `useWeeklyEntries(weekStart)` - Entries for specific week

### Files to Create/Modify
- `backend/app/routes/time_entries.py`
- `backend/app/schemas/time_entry.py`
- `backend/app/services/time_entry_service.py`
- `frontend/src/pages/TimeTracker.tsx`
- `frontend/src/components/WeeklyView.tsx`
- `frontend/src/components/TimeEntryCard.tsx`
- `frontend/src/components/TimerControls.tsx`
- `frontend/src/hooks/useTimeEntries.ts`
- `frontend/src/hooks/useActiveTimer.ts`

---

## Phase 3: Admin Settings UI

**Goal**: Build the settings/admin interface for managing clients, tags, and profile.

### 3.1 Settings Pages

**Settings Layout** - Tab-based navigation:
- Profile tab
- Clients tab
- Projects tab
- Category Tags tab

**Profile Settings** (`frontend/src/pages/settings/ProfileSettings.tsx`)
- Form for contractor info (name, address, contact)
- Payment instructions textarea
- Invoice number preview

**Client Management** (`frontend/src/pages/settings/ClientSettings.tsx`)
- Client list with add/edit/delete
- Client form: name, address, phone, hourly rate, service description
- Projects nested under each client

**Project Management** (nested in Client view)
- Add/edit/delete projects per client
- Active/inactive toggle

**Tag Management** (`frontend/src/pages/settings/TagSettings.tsx`)
- Tag list with color swatches
- Add/edit/delete tags
- Color picker for tag color

### Files to Create/Modify
- `frontend/src/pages/Settings.tsx` (enhance existing)
- `frontend/src/pages/settings/ProfileSettings.tsx`
- `frontend/src/pages/settings/ClientSettings.tsx`
- `frontend/src/pages/settings/TagSettings.tsx`
- `frontend/src/components/settings/ClientForm.tsx`
- `frontend/src/components/settings/ProjectForm.tsx`
- `frontend/src/components/settings/TagForm.tsx`

---

## Phase 4: Invoice Generation

**Goal**: Implement invoice creation and PDF generation matching the existing invoice style.

### 4.1 Invoice API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/invoices` | GET | List all invoices |
| `/api/invoices` | POST | Create invoice from time entries |
| `/api/invoices/:id` | GET | Get invoice details |
| `/api/invoices/:id` | DELETE | Delete draft invoice |
| `/api/invoices/:id/finalize` | POST | Finalize and generate PDF |
| `/api/invoices/:id/pdf` | GET | Download PDF |
| `/api/invoices/preview` | POST | Preview invoice data before creation |

### 4.2 Invoice Creation Flow
1. User selects client and date range
2. System pulls all time entries for that client/period
3. Preview shows line items, totals
4. User can adjust before creating
5. Create as draft → can edit
6. Finalize → generates PDF, locks invoice

### 4.3 PDF Generation

**Approach**: Similar to `/md2pdf` skill using Docker + WeasyPrint

**Invoice PDF Template** (`backend/app/templates/invoice.html`)
- Match existing invoice styling:
  - Gold/olive accent color (#B8973B for headings)
  - Clean white background
  - Professional typography
  - Header: Invoice #, contractor name/address/contact
  - Bill To / For / Hourly Rate row
  - Line items table: Project, Date, Total Hours, Amount
  - Footer: Subtotal, Tax Rate, Other, Total
  - Payment instructions
  - "Thank you" message

**PDF Service** (`backend/app/services/pdf_service.py`)
- Render HTML template with Jinja2
- Call WeasyPrint via Docker container
- Save PDF to configurable location
- Return PDF path

### 4.4 Frontend Invoice UI

**Invoice List Page** (`frontend/src/pages/Invoices.tsx`)
- List of invoices with status badges
- Create new invoice button
- Download PDF / View actions

**Create Invoice Page** (`frontend/src/pages/CreateInvoice.tsx`)
- Client selector
- Date range picker (start/end)
- Preview of entries to include
- Entry exclusion toggles
- Totals calculation preview
- Create Draft / Create & Finalize buttons

**Invoice Detail Page** (`frontend/src/pages/InvoiceDetail.tsx`)
- Full invoice view
- Edit (if draft)
- Finalize button
- Download PDF button

### Files to Create/Modify
- `backend/app/models/invoice.py`
- `backend/app/models/invoice_line_item.py`
- `backend/app/routes/invoices.py`
- `backend/app/schemas/invoice.py`
- `backend/app/services/invoice_service.py`
- `backend/app/services/pdf_service.py`
- `backend/app/templates/invoice.html`
- `backend/app/templates/invoice.css`
- `frontend/src/pages/Invoices.tsx`
- `frontend/src/pages/CreateInvoice.tsx`
- `frontend/src/pages/InvoiceDetail.tsx`

---

## Implementation Order

Each phase should be completed in a separate context session:

1. **Phase 1**: Scaffold + Models + Basic CRUD APIs (~1 session)
2. **Phase 2**: Time tracking UI + Timer functionality (~1 session)
3. **Phase 3**: Admin settings UI (~1 session)
4. **Phase 4**: Invoice generation + PDF (~1 session)

---

## Verification Plan

### Phase 1 Verification
```bash
docker compose up -d
# Test API endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/clients
curl -X POST http://localhost:5000/api/clients -H "Content-Type: application/json" -d '{"name": "Test Client", ...}'
# Run backend tests
docker compose exec api pytest
```

### Phase 2 Verification
- Start timer from UI, verify it persists
- Stop timer, verify duration calculated
- Add/edit/delete time entries
- Verify weekly grouping and totals

### Phase 3 Verification
- Create client with projects via settings UI
- Create/edit category tags
- Update user profile
- Verify data persists across page refreshes

### Phase 4 Verification
- Create invoice for date range
- Verify line items match time entries
- Generate PDF and compare to example invoices
- Check PDF styling matches original format

---

## Invoice PDF Styling Reference

From analyzed invoices, key styling:
- **Accent color**: Gold/olive (#B8973B or similar)
- **Headings**: "BILL TO", "FOR", "HOURLY RATE" in accent color
- **Table headers**: Project, Date, Total Hours, AMOUNT
- **Currency format**: $X,XXX.XX
- **Hours format**: X.XX
- **Footer totals**: Right-aligned, SUBTOTAL/TAX RATE/OTHER/TOTAL
- **Thank you message**: "THANK YOU FOR THE OPPURTUNITY!" (note: typo in original)
- **Payment note**: "Direct deposit preferred if possible, or make all checks payable to [Name]"
