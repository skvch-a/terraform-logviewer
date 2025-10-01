import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import LogViewer from './components/LogViewer';
import SectionsView from './components/SectionsView';
import './App.css';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState('logs'); // 'logs' or 'sections'

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Terraform Log Viewer</h1>
        <div style={styles.viewToggle}>
          <button 
            style={{...styles.toggleButton, ...(viewMode === 'logs' ? styles.activeButton : {})}}
            onClick={() => setViewMode('logs')}
          >
            Database Logs
          </button>
          <button 
            style={{...styles.toggleButton, ...(viewMode === 'sections' ? styles.activeButton : {})}}
            onClick={() => setViewMode('sections')}
          >
            Sections Parser
          </button>
        </div>
      </header>
      <main className="App-main">
        {viewMode === 'logs' ? (
          <>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
            <LogViewer refreshTrigger={refreshTrigger} />
          </>
        ) : (
          <SectionsView />
        )}
      </main>
    </div>
  );
}

const styles = {
  viewToggle: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
  },
  toggleButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.3s',
  },
  activeButton: {
    backgroundColor: '#007bff',
  },
};

export default App;
