import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const sendResearchQuery = async (queryData) => {
  const response = await axios.post(`${API_BASE}/research`, queryData);
  return response.data;
};