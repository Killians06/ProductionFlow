import axios from 'axios';
import { Command, DashboardStats } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fonction pour définir le token d'authentification pour toutes les requêtes
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Intercepteur de requête pour s'assurer que le token est présent
api.interceptors.request.use(
  (config) => {
    // Vérifier si on a un token dans le localStorage
    const token = localStorage.getItem('token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs et l'expiration du token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Erreur API:', error.response?.data || error.message);
    
    // Si l'erreur est 401 (token expiré ou invalide), nettoyer le localStorage
    if (error.response?.status === 401) {
      console.log('🔄 Token expiré, nettoyage du localStorage...');
      
      // Supprimer le token du localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Ne pas rediriger automatiquement pour éviter les boucles
      // La redirection sera gérée par le composant App
    }
    
    return Promise.reject(error);
  }
);

// Commands API
export const commandsApi = {
  getAll: async (params?: { status?: string; search?: string; page?: number; limit?: number; organisation?: string }) => {
    const response = await api.get('/commands', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Command> => {
    const response = await api.get(`/commands/${id}`);
    return response.data;
  },

  create: async (command: Omit<Command, 'id' | 'numero'>): Promise<Command> => {
    const response = await api.post('/commands', command);
    return response.data;
  },

  update: async (id: string, command: Partial<Command>): Promise<Command> => {
    const response = await api.put(`/commands/${id}`, command);
    return response.data;
  },

  updateStatus: async (id: string, statut: string, progression: number, notifierClient?: boolean): Promise<any> => {
    const response = await api.put(`/commands/${id}/status`, { statut, progression, notifierClient });
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/commands/${id}`);
  },

  getHistory: async (id: string): Promise<any[]> => {
    const response = await api.get(`/commands/${id}/history`);
    return response.data;
  },

  assignStep: async (commandId: string, stepId: string, userId: string): Promise<Command> => {
    const response = await api.put(`/commands/${commandId}/etapes/${stepId}/assign`, { userId });
    return response.data;
  },

  updateStepStatus: async (commandId: string, stepId: string, status: string): Promise<Command> => {
    const response = await api.put(`/commands/${commandId}/etapes/${stepId}/status`, { statut: status });
    return response.data;
  },

  completeProductionStep: async (commandId: string, stepId: string): Promise<Command> => {
    const response = await api.patch(`/commands/${commandId}/etapes/${stepId}/complete`);
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async (): Promise<any[]> => {
    const response = await api.get('/users');
    return response.data;
  }
};

// Stats API
export const statsApi = {
  getDashboard: async () => {
    const response = await api.get('/stats');
    return response.data;
  },
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Impossible de se connecter au serveur');
  }
};

export default api;