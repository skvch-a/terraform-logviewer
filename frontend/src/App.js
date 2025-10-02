import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import LogViewer from './components/LogViewer';
import SectionsView from './components/SectionsView';
import GanttView from './components/GanttView';
import PieChartView from './components/PieChartView';
import './App.css';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState('logs'); // 'logs', 'sections', 'gantt', or 'piechart'

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1 style={styles.title}>📊 Terraform LogViewer</h1>
        <div style={styles.viewToggle}>
          <button 
            style={{...styles.toggleButton, ...(viewMode === 'logs' ? styles.activeButton : {})}}
            onClick={() => setViewMode('logs')}
          >
            📋 Database Logs
          </button>
          <button 
            style={{...styles.toggleButton, ...(viewMode === 'sections' ? styles.activeButton : {})}}
            onClick={() => setViewMode('sections')}
          >
            📑 Sections Parser
          </button>
          <button 
            style={{...styles.toggleButton, ...(viewMode === 'gantt' ? styles.activeButton : {})}}
            onClick={() => setViewMode('gantt')}
          >
            📈 Gantt Chart
          </button>
          <button 
            style={{...styles.toggleButton, ...(viewMode === 'piechart' ? styles.activeButton : {})}}
            onClick={() => setViewMode('piechart')}
          >
            🥧 Log Statistics
          </button>
        </div>
      </header>
      <main className="App-main">
        {viewMode === 'logs' ? (
          <>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
            <LogViewer refreshTrigger={refreshTrigger} />
          </>
        ) : viewMode === 'sections' ? (
          <>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
            <SectionsView refreshTrigger={refreshTrigger} />
          </>
        ) : viewMode === 'gantt' ? (
          <>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
            <GanttView refreshTrigger={refreshTrigger} />
          </>
        ) : (
          <>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
            <PieChartView refreshTrigger={refreshTrigger} />
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  title: {
    margin: 0,
    fontSize: '2em',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  },
  viewToggle: {
    display: 'flex',
    gap: '12px',
    marginTop: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  toggleButton: {
    padding: '12px 24px',
    backgroundColor: '#495057',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  activeButton: {
    backgroundColor: '#007bff',
    boxShadow: '0 4px 8px rgba(0,123,255,0.4)',
    transform: 'translateY(-2px)',
  },
};

export default App;
