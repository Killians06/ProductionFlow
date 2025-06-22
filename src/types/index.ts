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

export interface Command {
  id: string;
  numero: string;
  client: {
    nom: string;
    email: string;
  };
  clientId?: Client;
  produits: {
    nom: string;
    quantite: number;
    specifications?: string;
  }[];
  dateCreation: Date;
  dateLivraison: Date;
  statut: CommandStatus;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  progression: number;
  etapes: ProductionStep[];
}

export interface History {
  _id: string;
  commandId: string;
  action: string;
  details: string;
  userId: string;
  timestamp: Date;
  user?: {
    _id: string;
    nom: string;
    email: string;
  };
}

export interface ProductionStep {
  _id: string;
  nom: string;
  description?: string;
  dureeEstimee?: number;
  statut: 'pending' | 'in-progress' | 'completed' | 'blocked';
  dateDebut?: Date;
  dateFin?: Date;
  responsable?: {
    _id: string;
    nom: string;
    email: string;
  };
}

export type CommandStatus = 
  | 'draft'
  | 'pending'
  | 'validated' 
  | 'in-production'
  | 'quality-check'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'canceled';

export interface DashboardStats {
  totalCommands: number;
  inProgress: number;
  completed: number;
  delayed: number;
  revenue: number;
  averageProductionTime: number;
}

export interface User {
  _id: string;
  nom: string;
  email: string;
  organisation: {
    id: string;
    nom: string;
  };
  role: 'admin' | 'user';
}