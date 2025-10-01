import React, { useState } from 'react';
import { uploadLogFile, clearSession } from '../services/api';

function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const result = await uploadLogFile(file);
      setMessage(`Success! Uploaded ${result.entries_count} log entries from ${result.filename}`);
      setFile(null);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClearSession = async () => {
    if (!window.confirm('Are you sure you want to clear all logs from the database? This action cannot be undone.')) {
      return;
    }

    setClearing(true);
    setMessage('');

    try {
      const result = await clearSession();
      setMessage(`Success! Cleared ${result.deleted_count} log entries from the database`);
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      setMessage(`Error: ${error.response?.data?.detail || error.message}`);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Upload Terraform Log File</h2>
      <div style={styles.uploadArea}>
        <input
          type="file"
          accept=".json,.log"
          onChange={handleFileChange}
          style={styles.fileInput}
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={styles.uploadButton}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button
          onClick={handleClearSession}
          disabled={clearing}
          style={styles.clearButton}
        >
          {clearing ? 'Clearing...' : 'Reset Session'}
        </button>
      </div>
      {message && (
        <div style={message.startsWith('Success') ? styles.successMessage : styles.errorMessage}>
          {message}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  uploadArea: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  fileInput: {
    flex: 1,
  },
  uploadButton: {
    padding: '10px 20px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  clearButton: {
    padding: '10px 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  successMessage: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#d4edda',
    color: '#155724',
    borderRadius: '4px',
  },
  errorMessage: {
    marginTop: '10px',
    padding: '10px',
    backgroundColor: '#f8d7da',
    color: '#721c24',
    borderRadius: '4px',
  },
};

export default FileUpload;
