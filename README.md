# Rae Time Tracker

[![CI](https://github.com/rae004/rae-time-tracker-and-invoice/actions/workflows/ci.yml/badge.svg)](https://github.com/rae004/rae-time-tracker-and-invoice/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/rae004/rae-time-tracker-and-invoice/branch/main/graph/badge.svg)](https://codecov.io/gh/rae004/rae-time-tracker-and-invoice)
[![Release](https://github.com/rae004/rae-time-tracker-and-invoice/actions/workflows/release-please.yml/badge.svg)](https://github.com/rae004/rae-time-tracker-and-invoice/actions/workflows/release-please.yml)
[![Version](https://img.shields.io/github/package-json/v/rae004/rae-time-tracker-and-invoice?filename=frontend%2Fpackage.json&color=blue&label=version)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Python](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Node.js](https://img.shields.io/badge/Node-24-brightgreen?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A single-user time tracking application with invoice generation capabilities, built with Flask, React 19, TypeScript, and PostgreSQL.

## Features

- **Quick-start timer** — one-click start, name and project optional
- **Millisecond precision** — durations tracked in ms, displayed as H:MM:SS.mmm
- Start/stop time tracking with named entries
- Weekly view (Saturday 00:00 - Friday 23:59) with totals
- Category tags for entries
- Editable entries (name, project, start/end time with second + millisecond precision, tags)
- Project-optional entries — entries can exist without a project assignment
- Admin settings for clients, tags, profile
- Invoice preview, creation, finalization, and PDF generation

## Tech Stack

### Backend
- **Python 3.13** with Flask
- **PostgreSQL 16** database
- **SQLAlchemy** ORM
- **Pydantic** for validation
- **Alembic** for migrations
- **WeasyPrint** for PDF generation
- **uv** for package management
- **Ruff** for linting/formatting
- **Pytest** for testing

### Frontend
- **React 19** with **TypeScript 5.6**
- **Vite 6** build tool
- **TailwindCSS 4** + **DaisyUI 5** for styling
- **TanStack React Query** for data fetching
- **React Router** for navigation
- **Vitest** + **React Testing Library** for testing

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 24+ (for local frontend development)
- Python 3.13+ and uv (for local backend development)

### Quick Start with Docker

```bash
# Start all services
docker compose up -d

# Run database migrations
docker compose exec api alembic upgrade head

# View logs
docker compose logs -f

# Stop services
docker compose down
```

The application will be available at:
- Frontend: http://localhost:5174
- Backend API: http://localhost:5001
- Database: localhost:5433

### Local Development

#### Backend

```bash
cd backend

# Install dependencies
uv sync

# Run migrations
uv run alembic upgrade head

# Start development server
uv run flask run --debug
```

Note: PDF generation (WeasyPrint) requires native libraries that are only available in the Docker container. All other features work locally.

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
rae-time-tracker/
├── backend/
│   ├── app/
│   │   ├── models/        # SQLAlchemy models
│   │   ├── routes/        # API endpoints
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # Business logic
│   │   ├── templates/     # Invoice HTML templates (PDF generation)
│   │   ├── config.py      # Configuration
│   │   └── extensions.py
│   ├── migrations/        # Alembic migrations
│   ├── tests/             # Backend tests
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   ├── test/          # Test setup and fixtures
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Shared utility functions (formatters)
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Linting & Formatting

### Backend (Ruff)

```bash
cd backend

# Lint
uv run ruff check .

# Lint and auto-fix
uv run ruff check . --fix

# Format
uv run ruff format .

# Check formatting without changes
uv run ruff format . --check
```

### Frontend (ESLint & TypeScript)

```bash
cd frontend

# Lint
npm run lint

# Type-check
npx tsc --noEmit
```

## Testing

### Backend Tests

```bash
cd backend
uv run pytest -v
```

Or run tests inside Docker (required for full coverage including PDF generation):

```bash
docker compose exec api uv run pytest -v
```

### Frontend Tests

```bash
cd frontend

# Run tests once
npm test

# Run in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage
```

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

### Time Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/time-entries` | List entries (filter by project_id, start_date, end_date, running) |
| POST | `/api/time-entries` | Start timer or create completed entry |
| GET | `/api/time-entries/active` | Get currently running timer |
| GET | `/api/time-entries/weekly` | Get entries grouped by day for a week |
| GET | `/api/time-entries/:id` | Get a time entry |
| PUT | `/api/time-entries/:id` | Update a time entry |
| DELETE | `/api/time-entries/:id` | Delete a time entry |
| POST | `/api/time-entries/:id/stop` | Stop a running timer |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices (filter by client_id, status) |
| POST | `/api/invoices` | Create an invoice |
| POST | `/api/invoices/preview` | Preview invoice before creation |
| GET | `/api/invoices/:id` | Get an invoice with line items |
| PUT | `/api/invoices/:id` | Update an invoice |
| DELETE | `/api/invoices/:id` | Delete a draft invoice |
| POST | `/api/invoices/:id/finalize` | Finalize invoice and generate PDF |
| GET | `/api/invoices/:id/pdf` | Download invoice PDF |

### Clients
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create a client |
| GET | `/api/clients/:id` | Get a client |
| PUT | `/api/clients/:id` | Update a client |
| DELETE | `/api/clients/:id` | Delete a client |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects (filter by client_id, active) |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Get a project |
| PUT | `/api/projects/:id` | Update a project |
| DELETE | `/api/projects/:id` | Delete a project |

### Category Tags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/category-tags` | List all tags |
| POST | `/api/category-tags` | Create a tag |
| GET | `/api/category-tags/:id` | Get a tag |
| PUT | `/api/category-tags/:id` | Update a tag |
| DELETE | `/api/category-tags/:id` | Delete a tag |

### User Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user-profile` | Get user profile |
| PUT | `/api/user-profile` | Update user profile |
| POST | `/api/user-profile` | Create/reset user profile |

## License

MIT