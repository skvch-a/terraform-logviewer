import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const uploadLogFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const getLogs = async (skip = 0, limit = 100, options = {}) => {
  const params = { skip, limit, ...options };

  // Clean up null/undefined/empty string params
  Object.keys(params).forEach(key => {
    if (params[key] === null || params[key] === undefined || params[key] === '') {
      delete params[key];
    }
  });

  const response = await axios.get(`${API_BASE_URL}/logs`, { params });
  return response.data;
};
