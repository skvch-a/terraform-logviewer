# Testing Guide

This document describes how to test the Terraform Log Viewer application.

## Quick Test

The fastest way to test the application is using the provided sample log file:

```bash
# Start the application
./start.sh

# Wait for all containers to be healthy (about 30 seconds)
docker compose ps

# Test backend health
curl http://localhost:8000/health

# Upload sample log file
curl -X POST http://localhost:8000/api/upload \
  -F "file=@sample-logs/terraform.log"

# View uploaded logs
curl http://localhost:8000/api/logs | jq .

# Open browser to view UI
# http://localhost:3000
```

## Manual Testing Checklist

### Backend API Tests

- [ ] **Health Check**
  ```bash
  curl http://localhost:8000/health
  # Expected: {"status":"healthy"}
  ```

- [ ] **Root Endpoint**
  ```bash
  curl http://localhost:8000/
  # Expected: {"message":"Terraform Log Viewer API","status":"running"}
  ```

- [ ] **Upload Valid Log File**
  ```bash
  curl -X POST http://localhost:8000/api/upload \
    -F "file=@sample-logs/terraform.log"
  # Expected: {"message":"File uploaded successfully","entries_count":13,"filename":"terraform.log"}
  ```

- [ ] **Upload Invalid File Type**
  ```bash
  echo "not json" > /tmp/test.txt
  curl -X POST http://localhost:8000/api/upload \
    -F "file=@/tmp/test.txt"
  # Expected: HTTP 400 error about file type
  ```

- [ ] **Get All Logs**
  ```bash
  curl http://localhost:8000/api/logs
  # Expected: Array of log entries
  ```

- [ ] **Filter by Log Level - Info**
  ```bash
  curl "http://localhost:8000/api/logs?level=info"
  # Expected: Array with only info level logs
  ```

- [ ] **Filter by Log Level - Error**
  ```bash
  curl "http://localhost:8000/api/logs?level=error"
  # Expected: Array with only error level logs
  ```

- [ ] **Filter by Log Level - Warn**
  ```bash
  curl "http://localhost:8000/api/logs?level=warn"
  # Expected: Array with only warn level logs
  ```

- [ ] **Pagination - First Page**
  ```bash
  curl "http://localhost:8000/api/logs?skip=0&limit=5"
  # Expected: Array with max 5 entries
  ```

- [ ] **Pagination - Second Page**
  ```bash
  curl "http://localhost:8000/api/logs?skip=5&limit=5"
  # Expected: Array with next 5 entries
  ```

### Frontend UI Tests

- [ ] **Access Frontend**
  - Open http://localhost:3000
  - Expected: Application loads with header "Terraform Log Viewer"

- [ ] **Upload File - Valid**
  - Click "Choose File"
  - Select `sample-logs/terraform.log`
  - Click "Upload"
  - Expected: Green success message showing entry count

- [ ] **View Uploaded Logs**
  - After upload, logs should appear below
  - Expected: List of log entries with colored badges

- [ ] **Filter Logs - All**
  - Select "All" from filter dropdown
  - Expected: All logs visible

- [ ] **Filter Logs - Error**
  - Select "Error" from filter dropdown
  - Expected: Only error logs visible

- [ ] **Filter Logs - Warning**
  - Select "Warning" from filter dropdown
  - Expected: Only warning logs visible

- [ ] **Filter Logs - Info**
  - Select "Info" from filter dropdown
  - Expected: Only info logs visible

- [ ] **Expand Raw Data**
  - Click "Raw Data" on a log entry
  - Expected: JSON data expands showing full log object

- [ ] **Upload File - Invalid**
  - Create a text file with invalid JSON
  - Try to upload
  - Expected: Red error message

### Database Tests

- [ ] **Connect to Database**
  ```bash
  docker compose exec db psql -U postgres -d terraform_logs
  ```

- [ ] **Check Table Structure**
  ```sql
  \d terraform_logs
  ```
  Expected: Table with columns: id, filename, uploaded_at, log_level, timestamp, message, raw_data

- [ ] **Count Entries**
  ```sql
  SELECT COUNT(*) FROM terraform_logs;
  ```
  Expected: Number of uploaded log entries

- [ ] **Query by Level**
  ```sql
  SELECT log_level, COUNT(*) FROM terraform_logs GROUP BY log_level;
  ```
  Expected: Count grouped by level

- [ ] **Check Raw Data**
  ```sql
  SELECT raw_data FROM terraform_logs LIMIT 1;
  ```
  Expected: JSON object with log data

### Docker Tests

- [ ] **Check Running Containers**
  ```bash
  docker compose ps
  ```
  Expected: All 3 containers (db, backend, frontend) running

- [ ] **Check Container Logs - Database**
  ```bash
  docker compose logs db
  ```
  Expected: No errors, successful startup

- [ ] **Check Container Logs - Backend**
  ```bash
  docker compose logs backend
  ```
  Expected: Uvicorn started, no errors

- [ ] **Check Container Logs - Frontend**
  ```bash
  docker compose logs frontend
  ```
  Expected: Nginx started, no errors

- [ ] **Check Network Connectivity**
  ```bash
  docker compose exec backend ping -c 1 db
  docker compose exec frontend ping -c 1 backend
  ```
  Expected: Successful pings

### Integration Tests

- [ ] **End-to-End Flow**
  1. Start fresh: `docker compose down -v && docker compose up -d`
  2. Wait for healthy: `docker compose ps`
  3. Upload via UI
  4. Verify in database
  5. View in UI
  6. Filter logs
  7. Check via API

## Sample Test Data

### Valid JSONL Log
```bash
cat > /tmp/test.log << 'EOF'
{"@level":"info","@message":"Test info message","@timestamp":"2024-01-15T10:00:00Z"}
{"@level":"error","@message":"Test error message","@timestamp":"2024-01-15T10:00:01Z"}
{"@level":"warn","@message":"Test warning message","@timestamp":"2024-01-15T10:00:02Z"}
EOF

curl -X POST http://localhost:8000/api/upload -F "file=@/tmp/test.log"
```

### Valid JSON Array
```bash
cat > /tmp/test.json << 'EOF'
[
  {"level":"info","message":"Array test 1","timestamp":"2024-01-15T10:00:00Z"},
  {"level":"debug","message":"Array test 2","timestamp":"2024-01-15T10:00:01Z"}
]
EOF

curl -X POST http://localhost:8000/api/upload -F "file=@/tmp/test.json"
```

### Invalid JSON
```bash
echo "not valid json" > /tmp/invalid.json
curl -X POST http://localhost:8000/api/upload -F "file=@/tmp/invalid.json"
# Expected: 400 error
```

## Performance Tests

### Upload Large File
```bash
# Generate large log file
python3 << 'EOF'
import json
with open('/tmp/large.log', 'w') as f:
    for i in range(1000):
        log = {
            "@level": ["info", "error", "warn"][i % 3],
            "@message": f"Log entry {i}",
            "@timestamp": f"2024-01-15T10:00:{i % 60:02d}Z"
        }
        f.write(json.dumps(log) + '\n')
EOF

# Upload
time curl -X POST http://localhost:8000/api/upload -F "file=@/tmp/large.log"

# Should complete in reasonable time (< 5 seconds)
```

### Query Performance
```bash
# Query with large result set
time curl "http://localhost:8000/api/logs?limit=1000" > /dev/null

# Should complete in reasonable time (< 2 seconds)
```

## Cleanup After Testing

```bash
# Stop and remove all containers and volumes
docker compose down -v

# Remove test files
rm -f /tmp/test.log /tmp/test.json /tmp/invalid.json /tmp/large.log /tmp/test.txt
```

## Automated Testing

For automated testing, you can use this script:

```bash
#!/bin/bash
# automated-test.sh

set -e

echo "Starting Terraform Log Viewer tests..."

# Start services
docker compose up -d
sleep 10

# Test backend health
if curl -f http://localhost:8000/health; then
    echo "✓ Backend health check passed"
else
    echo "✗ Backend health check failed"
    exit 1
fi

# Test upload
RESPONSE=$(curl -s -X POST http://localhost:8000/api/upload \
    -F "file=@sample-logs/terraform.log")

if echo "$RESPONSE" | grep -q "File uploaded successfully"; then
    echo "✓ File upload passed"
else
    echo "✗ File upload failed"
    exit 1
fi

# Test retrieval
if curl -f "http://localhost:8000/api/logs" > /dev/null; then
    echo "✓ Log retrieval passed"
else
    echo "✗ Log retrieval failed"
    exit 1
fi

echo "All tests passed!"
```

Save as `automated-test.sh`, make executable with `chmod +x automated-test.sh`, and run with `./automated-test.sh`.
