import api from './api';

export interface Client {
  _id: string;
  nomSociete: string;
  personneContact: {
    nom: string;
    prenom: string;
    fonction?: string;
  };
  email: string;
  telephone?: string;
  adresse: {
    rue?: string;
    codePostal?: string;
    ville?: string;
    pays: string;
  };
  notes?: string;
  actif: boolean;
  organisation: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientData {
  nomSociete: string;
  personneContact: {
    nom: string;
    prenom: string;
    fonction?: string;
  };
  email: string;
  telephone?: string;
  adresse: {
    rue?: string;
    codePostal?: string;
    ville?: string;
    pays?: string;
  };
  notes?: string;
}

export const clientService = {
  // Récupérer tous les clients
  getClients: async (search = '', actif = true): Promise<Client[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (actif !== undefined) params.append('actif', actif.toString());
    
    const response = await api.get(`/clients?${params}`);
    return response.data;
  },

  // Récupérer un client par ID
  getClient: async (id: string): Promise<Client> => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  // Créer un nouveau client
  createClient: async (clientData: CreateClientData): Promise<Client> => {
    const response = await api.post('/clients', clientData);
    return response.data;
  },

  // Mettre à jour un client
  updateClient: async (id: string, clientData: Partial<CreateClientData>): Promise<Client> => {
    const response = await api.put(`/clients/${id}`, clientData);
    return response.data;
  },

  // Supprimer un client (désactivation)
  deleteClient: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  }
}; 