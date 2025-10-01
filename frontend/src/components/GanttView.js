import React, { useState, useEffect } from 'react';
import { getGanttData } from '../services/api';

function GanttView({ refreshTrigger }) {
  const [ganttData, setGanttData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredRequest, setHoveredRequest] = useState(null);

  useEffect(() => {
    fetchGanttData();
  }, [refreshTrigger]);

  const fetchGanttData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGanttData();
      setGanttData(data);
    } catch (err) {
      setError(`Error loading Gantt data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const parseTimestamp = (timestamp) => {
    if (!timestamp) return null;
    try {
      return new Date(timestamp);
    } catch {
      return null;
    }
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const startTime = parseTimestamp(start);
    const endTime = parseTimestamp(end);
    if (!startTime || !endTime) return 0;
    return (endTime - startTime) / 1000; // duration in seconds
  };

  const formatDuration = (start, end) => {
    const duration = calculateDuration(start, end);
    if (duration === 0) return 'N/A';
    
    if (duration < 1) {
      return `${(duration * 1000).toFixed(0)}ms`;
    } else if (duration < 60) {
      return `${duration.toFixed(2)}s`;
    } else {
      const minutes = Math.floor(duration / 60);
      const seconds = (duration % 60).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  };

  const getColorForRPC = (rpc) => {
    const colors = {
      'GetProviderSchema': '#4CAF50',
      'ConfigureProvider': '#2196F3',
      'ValidateProviderConfig': '#9C27B0',
      'ValidateResourceConfig': '#FF9800',
      'ValidateDataResourceConfig': '#FF5722',
      'PlanResourceChange': '#00BCD4',
      'ReadDataSource': '#CDDC39',
      'ApplyResourceChange': '#E91E63',
      'ReadResource': '#795548',
    };
    return colors[rpc] || '#607D8B';
  };

  const renderGanttChart = () => {
    if (!ganttData || ganttData.length === 0) {
      return <div style={styles.noData}>No request data available. Upload logs to see the Gantt chart.</div>;
    }

    // Find the overall time range
    let minTime = null;
    let maxTime = null;

    ganttData.forEach(request => {
      const start = parseTimestamp(request.start_timestamp);
      const end = parseTimestamp(request.end_timestamp);
      
      if (start && (!minTime || start < minTime)) minTime = start;
      if (end && (!maxTime || end > maxTime)) maxTime = end;
    });

    if (!minTime || !maxTime) {
      return <div style={styles.noData}>Unable to parse timestamps from data.</div>;
    }

    const totalDuration = (maxTime - minTime) / 1000; // in seconds
    const chartWidth = 900; // pixels for the timeline
    const barHeight = 30;
    const barGap = 10;
    const leftMargin = 300;
    const topMargin = 50;

    const getXPosition = (timestamp) => {
      const time = parseTimestamp(timestamp);
      if (!time) return leftMargin;
      const offset = (time - minTime) / 1000;
      return leftMargin + (offset / totalDuration) * chartWidth;
    };

    const getBarWidth = (start, end) => {
      const startX = getXPosition(start);
      const endX = getXPosition(end);
      return Math.max(endX - startX, 2); // minimum 2px width
    };

    // Group by RPC type
    const groupedByRPC = ganttData.reduce((acc, request) => {
      const rpc = request.tf_rpc || 'Unknown';
      if (!acc[rpc]) acc[rpc] = [];
      acc[rpc].push(request);
      return acc;
    }, {});

    let yOffset = topMargin;
    const sections = [];

    Object.entries(groupedByRPC).forEach(([rpc, requests]) => {
      const sectionY = yOffset;
      
      requests.forEach((request, idx) => {
        const barY = yOffset + idx * (barHeight + barGap);
        const barX = getXPosition(request.start_timestamp);
        const barWidth = getBarWidth(request.start_timestamp, request.end_timestamp);
        const color = getColorForRPC(rpc);

        sections.push(
          <g key={request.tf_req_id}>
            {/* Request bar */}
            <rect
              x={barX}
              y={barY}
              width={barWidth}
              height={barHeight}
              fill={color}
              opacity={hoveredRequest === request.tf_req_id ? 1 : 0.8}
              stroke={hoveredRequest === request.tf_req_id ? '#000' : color}
              strokeWidth={hoveredRequest === request.tf_req_id ? 2 : 0}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredRequest(request.tf_req_id)}
              onMouseLeave={() => setHoveredRequest(null)}
            />
            {/* Request ID label */}
            <text
              x={leftMargin - 10}
              y={barY + barHeight / 2}
              textAnchor="end"
              alignmentBaseline="middle"
              style={{ fontSize: '10px', fill: '#333' }}
            >
              {request.tf_req_id.substring(0, 8)}...
            </text>
          </g>
        );
      });

      // RPC type label
      sections.push(
        <text
          key={`label-${rpc}`}
          x={10}
          y={sectionY + 15}
          style={{ fontSize: '14px', fontWeight: 'bold', fill: '#333' }}
        >
          {rpc}
        </text>
      );

      yOffset += requests.length * (barHeight + barGap) + 20;
    });

    const svgHeight = yOffset + 50;

    // Time axis markers
    const timeMarkers = [];
    const numMarkers = 10;
    for (let i = 0; i <= numMarkers; i++) {
      const x = leftMargin + (i / numMarkers) * chartWidth;
      const time = new Date(minTime.getTime() + (i / numMarkers) * (maxTime - minTime));
      timeMarkers.push(
        <g key={`marker-${i}`}>
          <line
            x1={x}
            y1={topMargin - 10}
            x2={x}
            y2={svgHeight - 30}
            stroke="#ddd"
            strokeDasharray="2,2"
          />
          <text
            x={x}
            y={topMargin - 15}
            textAnchor="middle"
            style={{ fontSize: '9px', fill: '#666' }}
          >
            {time.toLocaleTimeString()}
          </text>
        </g>
      );
    }

    return (
      <div style={styles.chartContainer}>
        <svg width={leftMargin + chartWidth + 50} height={svgHeight}>
          {/* Time axis */}
          <line
            x1={leftMargin}
            y1={topMargin - 10}
            x2={leftMargin + chartWidth}
            y2={topMargin - 10}
            stroke="#333"
            strokeWidth={2}
          />
          {timeMarkers}
          {sections}
        </svg>

        {/* Tooltip for hovered request */}
        {hoveredRequest && (
          <div style={styles.tooltip}>
            {ganttData.filter(r => r.tf_req_id === hoveredRequest).map(request => (
              <div key={request.tf_req_id}>
                <div><strong>Request ID:</strong> {request.tf_req_id}</div>
                <div><strong>RPC:</strong> {request.tf_rpc || 'N/A'}</div>
                <div><strong>Resource:</strong> {request.tf_resource_type || 'N/A'}</div>
                <div><strong>Duration:</strong> {formatDuration(request.start_timestamp, request.end_timestamp)}</div>
                <div><strong>Logs:</strong> {request.log_count}</div>
                <div><strong>Start:</strong> {request.start_timestamp}</div>
                <div><strong>End:</strong> {request.end_timestamp}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h2>Gantt Chart - Request Timeline</h2>
      <p style={styles.description}>
        Visualize the chronology of Terraform requests and responses based on tf_req_id
      </p>

      <div style={styles.controls}>
        <button onClick={fetchGanttData} style={styles.refreshButton}>
          Refresh Data
        </button>
      </div>

      {loading && <div style={styles.loading}>Loading Gantt chart data...</div>}
      {error && <div style={styles.error}>{error}</div>}

      {!loading && !error && (
        <>
          <div style={styles.stats}>
            <div>Total Requests: {ganttData.length}</div>
            {ganttData.length > 0 && (
              <div>
                Time Range: {formatDuration(
                  ganttData[0]?.start_timestamp,
                  ganttData[ganttData.length - 1]?.end_timestamp
                )}
              </div>
            )}
          </div>
          
          <div style={styles.legend}>
            <h3>RPC Types:</h3>
            <div style={styles.legendItems}>
              {['GetProviderSchema', 'ConfigureProvider', 'ValidateProviderConfig', 
                'ValidateResourceConfig', 'ValidateDataResourceConfig', 'PlanResourceChange',
                'ReadDataSource', 'ApplyResourceChange', 'ReadResource'].map(rpc => (
                <div key={rpc} style={styles.legendItem}>
                  <div style={{ 
                    ...styles.legendColor, 
                    backgroundColor: getColorForRPC(rpc) 
                  }} />
                  <span>{rpc}</span>
                </div>
              ))}
            </div>
          </div>

          {renderGanttChart()}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
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
  stats: {
    display: 'flex',
    gap: '20px',
    padding: '10px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  legend: {
    backgroundColor: '#fff',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  legendItems: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px',
    marginTop: '10px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  legendColor: {
    width: '20px',
    height: '20px',
    borderRadius: '3px',
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '4px',
    overflowX: 'auto',
    position: 'relative',
  },
  tooltip: {
    position: 'fixed',
    top: '50%',
    right: '20px',
    transform: 'translateY(-50%)',
    backgroundColor: '#fff',
    border: '2px solid #007bff',
    borderRadius: '4px',
    padding: '15px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 1000,
    maxWidth: '300px',
    fontSize: '12px',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '18px',
    color: '#666',
  },
  error: {
    padding: '15px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  noData: {
    textAlign: 'center',
    padding: '40px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    color: '#666',
  },
};

export default GanttView;
