import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import LogViewer from './components/LogViewer';
import './App.css';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Terraform Log Viewer</h1>
      </header>
      <main className="App-main">
        <FileUpload onUploadSuccess={handleUploadSuccess} />
        <LogViewer refreshTrigger={refreshTrigger} />
      </main>
    </div>
  );
}

export default App;
