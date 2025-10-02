import React, { useState, useEffect, useCallback } from 'react';
import { getLogs } from '../services/api';

function LogViewer({ refreshTrigger }) {
  const [logs, setLogs] = useState([]);
  const [groupedLogs, setGroupedLogs] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [groupByRequestId, setGroupByRequestId] = useState(true);

  // State for filters
  const [levelFilter, setLevelFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [startTimestamp, setStartTimestamp] = useState('');
  const [endTimestamp, setEndTimestamp] = useState('');
  const [reqIdFilter, setReqIdFilter] = useState('');
  const [rpcFilter, setRpcFilter] = useState('');
  const [messageFilter, setMessageFilter] = useState('');


  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filterOptions = {
        level: levelFilter,
        tf_resource_type: resourceTypeFilter,
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp,
        tf_req_id: reqIdFilter,
        tf_rpc: rpcFilter,
        message_contains: messageFilter,
        group_by_request_id: groupByRequestId,
      };
      const data = await getLogs(0, 1000, filterOptions); // Increased limit for better grouping
      setLogs(data);
    } catch (err) {
      setError(`Error loading logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [levelFilter, resourceTypeFilter, startTimestamp, endTimestamp, reqIdFilter, rpcFilter, messageFilter, groupByRequestId]);

  // Group logs by tf_req_id (only if grouping is enabled)
  useEffect(() => {
    if (groupByRequestId) {
      const groups = logs.reduce((acc, log) => {
        const key = log.tf_req_id || 'no-request-id';
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(log);
        return acc;
      }, {});
      setGroupedLogs(groups);
    } else {
      setGroupedLogs({});
    }
  }, [logs, groupByRequestId]);


  useEffect(() => {
    fetchLogs();
  }, [refreshTrigger, levelFilter, resourceTypeFilter, startTimestamp, endTimestamp, reqIdFilter, rpcFilter, messageFilter, groupByRequestId, fetchLogs]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

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
        <button 
          onClick={() => setGroupByRequestId(!groupByRequestId)}
          style={styles.groupToggleButton}
        >
          {groupByRequestId ? '📋 Disable Grouping' : '📋 Enable Grouping'}
        </button>
      </div>

      <form onSubmit={handleFilterSubmit} style={styles.filterForm}>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={styles.input}>
          <option value="">All Levels</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
          <option value="trace">Trace</option>
        </select>
        <input
          type="text"
          placeholder="Resource Type"
          value={resourceTypeFilter}
          onChange={(e) => setResourceTypeFilter(e.target.value)}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Request ID"
          value={reqIdFilter}
          onChange={(e) => setReqIdFilter(e.target.value)}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="RPC Method"
          value={rpcFilter}
          onChange={(e) => setRpcFilter(e.target.value)}
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Message contains..."
          value={messageFilter}
          onChange={(e) => setMessageFilter(e.target.value)}
          style={styles.input}
        />
        <input
          type="datetime-local"
          title="Start timestamp"
          value={startTimestamp}
          onChange={(e) => setStartTimestamp(e.target.value)}
          style={styles.input}
        />
        <input
          type="datetime-local"
          title="End timestamp"
          value={endTimestamp}
          onChange={(e) => setEndTimestamp(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Apply Filters</button>
      </form>

      {loading && <div style={styles.loading}>Loading logs...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && logs.length === 0 && (
        <div style={styles.noData}>No logs found. Upload a Terraform log file or adjust filters.</div>
      )}

      <div style={styles.logList}>
        {groupByRequestId ? (
          // Grouped view
          Object.entries(groupedLogs).map(([reqId, logGroup]) => (
            <details key={reqId} style={styles.logGroup} open>
              <summary style={styles.groupSummary}>
                Request ID: {reqId} ({logGroup.length} entries)
              </summary>
              {logGroup.map((log) => (
                <div key={log.id} style={styles.logEntry}>
                  <div style={styles.logHeader}>
                    <span style={{ ...styles.logLevel, backgroundColor: getLevelColor(log.log_level) }}>
                      {log.log_level || 'UNKNOWN'}
                    </span>
                    <span style={styles.timestamp}>{log.timestamp}</span>
                    <span style={styles.filename}>{log.filename}</span>
                  </div>
                  <div style={styles.logMessage}>{log.message}</div>
                   {log.tf_resource_type && <div style={styles.metadata}><strong>Resource:</strong> {log.tf_resource_type}</div>}
                   {log.tf_rpc && <div style={styles.metadata}><strong>RPC:</strong> {log.tf_rpc}</div>}
                  {log.raw_data && (
                    <details style={styles.details}>
                      <summary style={styles.summary}>Raw Data</summary>
                      <pre style={styles.rawData}>{JSON.stringify(log.raw_data, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
            </details>
          ))
        ) : (
          // Flat view
          logs.map((log) => (
            <div key={log.id} style={styles.logEntryFlat}>
              <div style={styles.logHeader}>
                <span style={{ ...styles.logLevel, backgroundColor: getLevelColor(log.log_level) }}>
                  {log.log_level || 'UNKNOWN'}
                </span>
                <span style={styles.timestamp}>{log.timestamp}</span>
                <span style={styles.filename}>{log.filename}</span>
                {log.tf_req_id && <span style={styles.reqId}>Request ID: {log.tf_req_id}</span>}
              </div>
              <div style={styles.logMessage}>{log.message}</div>
               {log.tf_resource_type && <div style={styles.metadata}><strong>Resource:</strong> {log.tf_resource_type}</div>}
               {log.tf_rpc && <div style={styles.metadata}><strong>RPC:</strong> {log.tf_rpc}</div>}
              {log.raw_data && (
                <details style={styles.details}>
                  <summary style={styles.summary}>Raw Data</summary>
                  <pre style={styles.rawData}>{JSON.stringify(log.raw_data, null, 2)}</pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px' },
  header: { 
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  groupToggleButton: {
    padding: '8px 15px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#6c757d',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  filterForm: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    flexWrap: 'wrap',
  },
  input: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '8px 15px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
  },
  loading: { textAlign: 'center', padding: '20px', color: '#666' },
  error: { padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '20px' },
  noData: { textAlign: 'center', padding: '40px', color: '#666', backgroundColor: '#f5f5f5', borderRadius: '8px' },
  logList: { display: 'flex', flexDirection: 'column', gap: '15px' },
  logGroup: {
    border: '1px solid #ccc',
    borderRadius: '4px',
  },
  groupSummary: {
    padding: '10px',
    cursor: 'pointer',
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
  },
  logEntry: {
    backgroundColor: 'white',
    borderTop: '1px solid #eee',
    padding: '15px',
    marginLeft: '20px'
  },
  logEntryFlat: {
    backgroundColor: 'white',
    border: '1px solid #eee',
    borderRadius: '4px',
    padding: '15px',
  },
  logHeader: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' },
  logLevel: { padding: '4px 8px', borderRadius: '4px', color: 'white', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' },
  timestamp: { color: '#666', fontSize: '14px' },
  filename: { color: '#999', fontSize: '12px', marginLeft: 'auto' },
  reqId: { color: '#007bff', fontSize: '12px', fontWeight: 'bold' },
  logMessage: { marginBottom: '10px', lineHeight: '1.5' },
  metadata: { fontSize: '12px', color: '#555', marginBottom: '5px' },
  details: { marginTop: '10px' },
  summary: { cursor: 'pointer', color: '#007bff', fontWeight: 'bold' },
  rawData: { backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px', overflow: 'auto', fontSize: '12px' },
};

export default LogViewer;
