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

export const getLogs = async (skip = 0, limit = 100, level = null) => {
  const params = { skip, limit };
  if (level) {
    params.level = level;
  }

  const response = await axios.get(`${API_BASE_URL}/logs`, { params });
  return response.data;
};
