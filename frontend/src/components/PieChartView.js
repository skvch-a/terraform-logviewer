import React, { useState, useEffect } from 'react';
import { getLogs } from '../services/api';

function PieChartView({ refreshTrigger }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [levelStats, setLevelStats] = useState({});

  useEffect(() => {
    fetchLevelStats();
  }, [refreshTrigger]);

  const fetchLevelStats = async () => {
    setLoading(true);
    setError('');

    try {
      const logs = await getLogs(0, 2000, { group_by_request_id: false });
      
      // Count logs by level
      const stats = {};
      logs.forEach(log => {
        const level = (log.log_level || 'UNKNOWN').toLowerCase();
        stats[level] = (stats[level] || 0) + 1;
      });

      setLevelStats(stats);
    } catch (err) {
      setError(`Error loading logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level) => {
    const colors = {
      error: '#dc3545',
      warn: '#ffc107',
      warning: '#ffc107',
      info: '#17a2b8',
      debug: '#6c757d',
      trace: '#868e96',
      unknown: '#000',
    };
    return colors[level?.toLowerCase()] || '#000';
  };

  const renderPieChart = () => {
    if (Object.keys(levelStats).length === 0) {
      return <div style={styles.noData}>No logs available. Upload logs to see the chart.</div>;
    }

    const total = Object.values(levelStats).reduce((sum, count) => sum + count, 0);
    const sortedLevels = Object.entries(levelStats).sort((a, b) => b[1] - a[1]);

    // Calculate percentages and angles
    let currentAngle = 0;
    const slices = sortedLevels.map(([level, count]) => {
      const percentage = (count / total) * 100;
      const angle = (count / total) * 360;
      const slice = {
        level,
        count,
        percentage: percentage.toFixed(1),
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: getLevelColor(level),
      };
      currentAngle += angle;
      return slice;
    });

    return (
      <div style={styles.chartContainer}>
        <svg width="400" height="400" viewBox="0 0 400 400">
          <g transform="translate(200, 200)">
            {slices.map((slice, idx) => {
              const startAngle = (slice.startAngle - 90) * (Math.PI / 180);
              const endAngle = (slice.endAngle - 90) * (Math.PI / 180);
              const radius = 150;

              const x1 = radius * Math.cos(startAngle);
              const y1 = radius * Math.sin(startAngle);
              const x2 = radius * Math.cos(endAngle);
              const y2 = radius * Math.sin(endAngle);

              const largeArc = slice.endAngle - slice.startAngle > 180 ? 1 : 0;

              const pathData = [
                `M 0 0`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                `Z`
              ].join(' ');

              return (
                <path
                  key={idx}
                  d={pathData}
                  fill={slice.color}
                  stroke="white"
                  strokeWidth="2"
                  opacity="0.9"
                />
              );
            })}
          </g>
        </svg>

        <div style={styles.legend}>
          <h3 style={styles.legendTitle}>Log Levels</h3>
          {slices.map((slice, idx) => (
            <div key={idx} style={styles.legendItem}>
              <div style={{ ...styles.legendColor, backgroundColor: slice.color }} />
              <span style={styles.legendLabel}>
                <strong>{slice.level.toUpperCase()}:</strong> {slice.count} ({slice.percentage}%)
              </span>
            </div>
          ))}
          <div style={styles.legendTotal}>
            <strong>Total Logs:</strong> {total}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h2>Log Level Statistics</h2>
      <p style={styles.description}>
        View the distribution of logs by their severity level
      </p>

      {loading && <div style={styles.loading}>Loading statistics...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && !error && renderPieChart()}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
  },
  description: {
    color: '#666',
    marginBottom: '20px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
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
  chartContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '50px',
    flexWrap: 'wrap',
    marginTop: '30px',
  },
  legend: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minWidth: '250px',
  },
  legendTitle: {
    marginTop: 0,
    marginBottom: '15px',
    fontSize: '18px',
    color: '#333',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '10px',
  },
  legendColor: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    flexShrink: 0,
  },
  legendLabel: {
    fontSize: '14px',
    color: '#333',
  },
  legendTotal: {
    marginTop: '20px',
    paddingTop: '15px',
    borderTop: '2px solid #e0e0e0',
    fontSize: '16px',
    color: '#333',
  },
};

export default PieChartView;
