import axios from 'axios';
import api from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const authApi = axios.create({
  baseURL: API_URL,
});

export const registerUser = (userData: any) => {
  return authApi.post('/auth/register', userData);
};

export const loginUser = async (credentials: any) => {
  return authApi.post('/auth/login', credentials);
};

export const inviteUser = async (email: string) => {
  try {
    const response = await api.post('/invitations', { email });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getInvitationDetails = (token: string) => {
  return authApi.get(`/invitations/${token}`);
};

export default authApi; 