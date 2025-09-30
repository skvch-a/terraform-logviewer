# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User Browser                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP (Port 3000)
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     Frontend Container                       │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              React Application                      │    │
│  │  - FileUpload Component (upload JSON logs)          │    │
│  │  - LogViewer Component (display & filter logs)      │    │
│  │  - API Service (communicate with backend)           │    │
│  └────────────────────────────────────────────────────┘    │
│                          │                                   │
│                    Nginx Web Server                          │
│                    (serves static files                      │
│                     & proxies API calls)                     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP /api/* (Port 8000)
                             │
┌────────────────────────────▼────────────────────────────────┐
│                     Backend Container                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              FastAPI Application                    │    │
│  │                                                      │    │
│  │  API Layer:                                         │    │
│  │  ├── POST /api/upload (accepts JSON log files)      │    │
│  │  └── GET /api/logs (retrieve logs with filters)     │    │
│  │                                                      │    │
│  │  Service Layer:                                     │    │
│  │  ├── parse_terraform_log() - Parse JSON/JSONL      │    │
│  │  ├── save_logs_to_db() - Store in PostgreSQL       │    │
│  │  └── get_all_logs() / get_logs_by_level()          │    │
│  │                                                      │    │
│  │  Models Layer:                                      │    │
│  │  └── TerraformLog (SQLAlchemy ORM model)           │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ PostgreSQL Protocol (Port 5432)
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    Database Container                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              PostgreSQL 15                          │    │
│  │                                                      │    │
│  │  Table: terraform_logs                              │    │
│  │  ├── id (Primary Key)                               │    │
│  │  ├── filename                                        │    │
│  │  ├── uploaded_at (timestamp)                        │    │
│  │  ├── log_level (indexed)                            │    │
│  │  ├── timestamp                                       │    │
│  │  ├── message                                         │    │
│  │  └── raw_data (JSON)                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Volume: postgres_data (persistent storage)                 │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow

### Upload Flow

1. **User uploads log file** via FileUpload component
2. **Frontend** sends multipart/form-data POST to `/api/upload`
3. **Backend API** receives file and reads content
4. **Parser Service** analyzes format:
   - Detects JSONL (line-by-line JSON)
   - OR detects JSON array
   - Extracts log entries
5. **Service Layer** processes each entry:
   - Extracts `@level`/`level` field
   - Extracts `@message`/`message` field
   - Extracts `@timestamp`/`timestamp` field
   - Stores complete raw JSON
6. **Database Layer** saves entries to PostgreSQL
7. **Backend** returns success response with count
8. **Frontend** displays success message and refreshes log view

### View Flow

1. **User views logs** via LogViewer component
2. **Frontend** sends GET to `/api/logs?level=error` (optional filter)
3. **Backend API** queries database with filters
4. **Database** returns matching log entries
5. **Backend** serializes data to JSON
6. **Frontend** receives logs and renders:
   - Color-coded by severity level
   - Grouped by file
   - Expandable raw data
   - Filterable by level

## Technology Stack

### Frontend
- **React 18**: UI framework
- **Axios**: HTTP client for API calls
- **Nginx**: Web server for production deployment
- **CSS**: Styling (inline and external)

### Backend
- **Python 3.11**: Programming language
- **FastAPI**: Modern web framework
- **Uvicorn**: ASGI server
- **SQLAlchemy**: ORM for database operations
- **Psycopg2**: PostgreSQL adapter
- **Pydantic**: Data validation

### Database
- **PostgreSQL 15**: Relational database
- **JSON column type**: Store complete log data

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Git**: Version control

## Log Format Support

### JSONL (JSON Lines) Format
```json
{"@level":"info","@message":"Terraform initialized","@timestamp":"2024-01-15T10:00:00Z"}
{"@level":"error","@message":"Failed to create resource","@timestamp":"2024-01-15T10:00:01Z"}
```

### JSON Array Format
```json
[
  {"level":"info","message":"Terraform initialized","timestamp":"2024-01-15T10:00:00Z"},
  {"level":"error","message":"Failed to create resource","timestamp":"2024-01-15T10:00:01Z"}
]
```

Both formats are automatically detected and parsed correctly.

## Security Considerations

1. **CORS**: Configured to allow frontend access
2. **File Upload**: Limited to `.json` and `.log` extensions
3. **Database**: Password-protected (change defaults in production!)
4. **Network**: Containers communicate on internal network
5. **Data Validation**: Pydantic schemas validate all inputs

## Scalability Considerations

1. **Database Indexing**: 
   - Index on `log_level` for fast filtering
   - Index on `filename` for grouping
   
2. **Pagination**: 
   - API supports `skip` and `limit` parameters
   - Default limit prevents large queries

3. **Horizontal Scaling**:
   - Stateless backend allows multiple instances
   - Frontend served from CDN
   - Database can use read replicas

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Multi-tenancy support
- [ ] Advanced search with full-text indexing
- [ ] Real-time log streaming via WebSockets
- [ ] Export logs to CSV/JSON
- [ ] Dashboard with statistics and charts
- [ ] Log retention policies
- [ ] Rate limiting on uploads
- [ ] File size limits
- [ ] Support for compressed log files
