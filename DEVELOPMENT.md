# Development Guide

This document provides instructions for developers working on the Terraform Log Viewer project.

## Project Structure

```
terraform-logviewer/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── api/               # API endpoint handlers
│   │   │   └── __init__.py    # Upload and logs endpoints
│   │   ├── models/            # SQLAlchemy database models
│   │   │   └── __init__.py    # TerraformLog model
│   │   ├── schemas/           # Pydantic schemas for request/response
│   │   │   └── __init__.py    # LogEntry, LogUploadResponse
│   │   ├── services/          # Business logic
│   │   │   └── __init__.py    # Log parsing and database operations
│   │   ├── database.py        # Database connection setup
│   │   └── main.py            # FastAPI application entry point
│   ├── Dockerfile             # Backend container definition
│   └── requirements.txt       # Python dependencies
├── frontend/                   # React frontend
│   ├── public/
│   │   └── index.html        # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.js  # File upload component
│   │   │   └── LogViewer.js   # Log visualization component
│   │   ├── services/
│   │   │   └── api.js         # API client functions
│   │   ├── App.css            # Application styles
│   │   ├── App.js             # Main application component
│   │   └── index.js           # React entry point
│   ├── Dockerfile             # Frontend container definition
│   ├── nginx.conf             # Nginx configuration for production
│   └── package.json           # Node.js dependencies
├── sample-logs/               # Example log files for testing
│   └── terraform.log          # Sample Terraform JSONL log
├── docker-compose.yml         # Multi-container orchestration
├── .gitignore                # Git ignore patterns
├── README.md                  # Project documentation
└── start.sh                   # Quick start script

```

## Local Development

### Backend Development

1. **Setup Python environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Setup PostgreSQL:**
   You can use Docker to run just the database:
   ```bash
   docker run -d \
     --name terraform-logs-db \
     -e POSTGRES_USER=postgres \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=terraform_logs \
     -p 5432:5432 \
     postgres:15-alpine
   ```

3. **Set environment variable:**
   ```bash
   export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/terraform_logs"
   ```

4. **Run the backend:**
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. **Access the API:**
   - API: http://localhost:8000
   - Interactive docs: http://localhost:8000/docs
   - Alternative docs: http://localhost:8000/redoc

### Frontend Development

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Run development server:**
   ```bash
   npm start
   ```

3. **Access the frontend:**
   - Frontend: http://localhost:3000
   - The dev server will proxy API requests to http://localhost:8000

### Full Stack Development with Docker

1. **Build and start all services:**
   ```bash
   docker compose up --build
   ```

2. **Rebuild specific service:**
   ```bash
   docker compose up --build backend
   # or
   docker compose up --build frontend
   ```

3. **View logs:**
   ```bash
   docker compose logs -f
   docker compose logs -f backend
   docker compose logs -f frontend
   ```

## Testing

### Backend Tests

Test the log parser:
```bash
cd backend
python -c "
from app.services import parse_terraform_log
import json

# Test JSONL
with open('../sample-logs/terraform.log') as f:
    logs = parse_terraform_log(f.read(), 'test.log')
    print(f'Parsed {len(logs)} entries')
"
```

### Manual API Testing

Using curl:

```bash
# Health check
curl http://localhost:8000/health

# Upload log file
curl -X POST http://localhost:8000/api/upload \
  -F "file=@sample-logs/terraform.log"

# Get all logs
curl http://localhost:8000/api/logs

# Get logs with filter
curl "http://localhost:8000/api/logs?level=error"
```

Using HTTPie:

```bash
# Upload log file
http -f POST http://localhost:8000/api/upload file@sample-logs/terraform.log

# Get logs
http http://localhost:8000/api/logs

# Get error logs only
http http://localhost:8000/api/logs level==error
```

## Code Style

### Python (Backend)

- Follow PEP 8 guidelines
- Use type hints where appropriate
- Keep functions small and focused
- Document complex logic with comments

### JavaScript (Frontend)

- Use functional components with hooks
- Follow React best practices
- Keep components small and reusable
- Use meaningful variable names

## Database Schema

The `terraform_logs` table structure:

```sql
CREATE TABLE terraform_logs (
    id SERIAL PRIMARY KEY,
    filename VARCHAR NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    log_level VARCHAR,
    timestamp VARCHAR,
    message TEXT,
    raw_data JSON
);

CREATE INDEX idx_log_level ON terraform_logs(log_level);
CREATE INDEX idx_filename ON terraform_logs(filename);
```

## API Endpoints

### POST /api/upload

Upload a Terraform log file (JSON or JSONL format).

**Request:**
- Content-Type: multipart/form-data
- Body: file (required)

**Response:**
```json
{
  "message": "File uploaded successfully",
  "entries_count": 42,
  "filename": "terraform.log"
}
```

### GET /api/logs

Retrieve logs from the database.

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum records to return (default: 100, max: 1000)
- `level`: Filter by log level (optional)

**Response:**
```json
[
  {
    "id": 1,
    "filename": "terraform.log",
    "uploaded_at": "2024-01-15T10:00:00",
    "log_level": "info",
    "timestamp": "2024-01-15T10:00:00.000000Z",
    "message": "Terraform 1.6.0",
    "raw_data": {...}
  }
]
```

## Troubleshooting

### Backend Issues

**Database connection error:**
- Check if PostgreSQL is running
- Verify DATABASE_URL environment variable
- Check database credentials

**Import errors:**
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check Python version (3.11+ recommended)

### Frontend Issues

**API connection error:**
- Ensure backend is running on port 8000
- Check CORS settings in backend
- Verify API URL in frontend/src/services/api.js

**Build errors:**
- Clear node_modules: `rm -rf node_modules package-lock.json`
- Reinstall: `npm install`

### Docker Issues

**Container fails to start:**
- Check logs: `docker compose logs <service-name>`
- Verify port availability: `lsof -i :3000,8000,5432`
- Check Docker disk space: `docker system df`

**Database initialization:**
- Wait for database health check to pass
- Check database logs: `docker compose logs db`

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT
