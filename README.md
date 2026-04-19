# Rae Time Tracker

A single-user time tracking application with invoice generation capabilities, built with Flask, React 19, TypeScript, and PostgreSQL.

## Features

- Start/stop time tracking with named entries
- Weekly view (Saturday 00:00 - Friday 23:59) with totals
- Category tags for entries
- Editable entries (name, time, tags)
- Admin settings for clients, tags, profile
- PDF invoice generation

## Tech Stack

### Backend
- **Python 3.13** with Flask
- **PostgreSQL 16** database
- **SQLAlchemy** ORM
- **Pydantic** for validation
- **Alembic** for migrations
- **uv** for package management
- **Ruff** for linting/formatting
- **Pytest** for testing

### Frontend
- **React 19** with TypeScript
- **Vite** build tool
- **TailwindCSS 4** + **DaisyUI 5** for styling
- **React Query** for data fetching
- **React Router** for navigation
- **Vitest** for testing

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 24+ (for local frontend development)
- Python 3.13+ and uv (for local backend development)

### Quick Start with Docker

```bash
# Start all services
docker compose up -d

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
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routes/      # API endpoints
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   ├── config.py    # Configuration
│   │   └── extensions.py
│   ├── migrations/      # Alembic migrations
│   ├── tests/           # Backend tests
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom hooks
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   └── types/       # TypeScript types
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

### Frontend Tests

```bash
cd frontend
npm test
```

## API Endpoints

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

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
