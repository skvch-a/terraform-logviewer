import React, { useState, useEffect } from 'react';
import { getSectionsData } from '../services/api';

function SectionsView({ refreshTrigger }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sectionsData, setSectionsData] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    fetchSectionsData();
  }, [refreshTrigger]);

  const fetchSectionsData = async () => {
    setLoading(true);
    setMessage('');

    try {
      const result = await getSectionsData();
      if (result.total_logs === 0) {
        setMessage('No logs found in database. Please upload a log file first.');
        setSectionsData(null);
      } else {
        setSectionsData(result);
        let msg = `Successfully loaded ${result.total_logs} logs with ${result.sections.length} sections`;
        if (result.fixed_logs_count > 0) {
          msg += ` ⚠️ Warning: ${result.fixed_logs_count} log entries had missing fields that were automatically restored.`;
        }
        setMessage(msg);
        // Expand all sections by default
        const expanded = {};
        result.sections.forEach((_, idx) => {
          expanded[idx] = true;
        });
        setExpandedSections(expanded);
      }
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.detail || error.message}`);
      setSectionsData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getSectionColor = (type) => {
    const colors = {
      plan: '#007bff',
      apply: '#28a745',
      init: '#6c757d',
    };
    return colors[type?.toLowerCase()] || '#17a2b8';
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

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    try {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const durationMs = end - start;
      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      
      if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
      }
      return `${seconds}s`;
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div style={styles.container}>
      <h2>Terraform Sections Parser</h2>
      <p style={styles.description}>
        View organized sections (plan, apply, init) from database logs
      </p>
      
      <div style={styles.controls}>
        <button
          onClick={fetchSectionsData}
          disabled={loading}
          style={styles.refreshButton}
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>

      {message && (
        <div style={message.startsWith('Success') || message.startsWith('No logs') ? styles.successMessage : styles.errorMessage}>
          {message}
        </div>
      )}

      {sectionsData && (
        <div style={styles.sectionsContainer}>
          <div style={styles.summary}>
            <h3>Summary</h3>
            <p><strong>File:</strong> {sectionsData.filename}</p>
            <p><strong>Total Logs:</strong> {sectionsData.total_logs}</p>
            <p><strong>Sections Found:</strong> {sectionsData.sections.length}</p>
          </div>

          <div style={styles.sectionsList}>
            <h3>Sections</h3>
            {sectionsData.sections.map((section, idx) => (
              <div key={idx} style={styles.sectionCard}>
                <div 
                  style={{...styles.sectionHeader, backgroundColor: getSectionColor(section.type)}}
                  onClick={() => toggleSection(idx)}
                >
                  <span style={styles.sectionTitle}>
                    {expandedSections[idx] ? '▼' : '▶'} {section.type.toUpperCase()}
                  </span>
                  <span style={styles.sectionStats}>
                    {section.log_count} logs | Duration: {formatDuration(section.start_timestamp, section.end_timestamp)}
                  </span>
                </div>

                {expandedSections[idx] && (
                  <div style={styles.sectionContent}>
                    <div style={styles.sectionMeta}>
                      <div><strong>Start Index:</strong> {section.start_index}</div>
                      <div><strong>End Index:</strong> {section.end_index}</div>
                      <div><strong>Start Time:</strong> {section.start_timestamp || 'N/A'}</div>
                      <div><strong>End Time:</strong> {section.end_timestamp || 'N/A'}</div>
                    </div>

                    <div style={styles.logsContainer}>
                      {sectionsData.logs
                        .slice(section.start_index, section.end_index + 1)
                        .map((log, logIdx) => (
                          <div key={logIdx} style={styles.logEntry}>
                            <div style={styles.logHeader}>
                              <span style={{
                                ...styles.logLevel,
                                backgroundColor: getLevelColor(log['@level'] || log.level)
                              }}>
                                {log['@level'] || log.level || 'UNKNOWN'}
                              </span>
                              <span style={styles.timestamp}>
                                {log['@timestamp'] || log.timestamp || 'N/A'}
                              </span>
                            </div>
                            <div style={styles.logMessage}>
                              {log['@message'] || log.message || 'No message'}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
  },
  description: {
    color: '#666',
    marginBottom: '15px',
  },
  controls: {
    marginBottom: '20px',
  },
  refreshButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  successMessage: {
    padding: '10px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  errorMessage: {
    padding: '10px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  sectionsContainer: {
    marginTop: '20px',
  },
  summary: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  sectionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  sectionCard: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    padding: '15px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: '18px',
  },
  sectionStats: {
    fontSize: '14px',
  },
  sectionContent: {
    padding: '15px',
    backgroundColor: 'white',
  },
  sectionMeta: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    marginBottom: '15px',
    fontSize: '14px',
  },
  logsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  logEntry: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px',
    borderLeft: '3px solid #007bff',
  },
  logHeader: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    marginBottom: '8px',
  },
  logLevel: {
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '11px',
    textTransform: 'uppercase',
  },
  timestamp: {
    color: '#666',
    fontSize: '12px',
  },
  logMessage: {
    fontSize: '14px',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },
};

export default SectionsView;
