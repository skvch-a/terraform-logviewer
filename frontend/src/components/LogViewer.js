import React, { useState, useEffect } from 'react';
import { getLogs } from '../services/api';

function LogViewer({ refreshTrigger }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getLogs(0, 100, filter || null);
      setLogs(data);
    } catch (err) {
      setError(`Error loading logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger, filter]);

  const getLevelColor = (level) => {
    const colors = {
      error: '#dc3545',
      warn: '#ffc107',
      warning: '#ffc107',
      info: '#17a2b8',
      debug: '#6c757d',
      trace: '#868e96',
    };
    return colors[level?.toLowerCase()] || '#000';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Terraform Logs</h2>
        <div style={styles.filterArea}>
          <label>Filter by level: </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.select}
          >
            <option value="">All</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
            <option value="trace">Trace</option>
          </select>
        </div>
      </div>

      {loading && <div style={styles.loading}>Loading logs...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && logs.length === 0 && (
        <div style={styles.noData}>No logs found. Upload a Terraform log file to get started.</div>
      )}

      <div style={styles.logList}>
        {logs.map((log) => (
          <div key={log.id} style={styles.logEntry}>
            <div style={styles.logHeader}>
              <span
                style={{
                  ...styles.logLevel,
                  backgroundColor: getLevelColor(log.log_level),
                }}
              >
                {log.log_level || 'UNKNOWN'}
              </span>
              <span style={styles.timestamp}>{log.timestamp}</span>
              <span style={styles.filename}>{log.filename}</span>
            </div>
            <div style={styles.logMessage}>{log.message}</div>
            {log.raw_data && (
              <details style={styles.details}>
                <summary style={styles.summary}>Raw Data</summary>
                <pre style={styles.rawData}>
                  {JSON.stringify(log.raw_data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  filterArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  select: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: '#666',
  },
  error: {
    padding: '10px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  logEntry: {
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '15px',
  },
  logHeader: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '10px',
  },
  logLevel: {
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '12px',
    textTransform: 'uppercase',
  },
  timestamp: {
    color: '#666',
    fontSize: '14px',
  },
  filename: {
    color: '#999',
    fontSize: '12px',
    marginLeft: 'auto',
  },
  logMessage: {
    marginBottom: '10px',
    lineHeight: '1.5',
  },
  details: {
    marginTop: '10px',
  },
  summary: {
    cursor: 'pointer',
    color: '#007bff',
    fontWeight: 'bold',
  },
  rawData: {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '12px',
  },
};

export default LogViewer;
