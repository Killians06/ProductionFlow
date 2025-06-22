export type CommandStatus = 
  | 'draft'
  | 'validated'
  | 'in-production'
  | 'quality-check'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'canceled';

export interface User {
  _id: string;
  id: string;
  nom: string;
  email: string;
  role: 'admin' | 'user';
  organisation?: {
    _id: string;
    nom: string;
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

export interface CommandHistoryEntry {
  _id: string;
  status: CommandStatus;
  updatedAt: string;
  updatedBy: {
    _id: string;
    nom: string;
  };
}

export interface Command {
  id?: string;
  _id: string;
  numero: string;
  dateCreation: string;
  dateLivraison: string;
  clientId: Client | null;
  client: {
    nom: string;
    email: string;
  };
  produits: {
    nom: string;
    quantite: number;
    specifications?: string;
  }[];
  statut: CommandStatus;
  progression: number;
  etapesProduction: ProductionStep[];
  history: CommandHistoryEntry[];
  lastModifiedBy?: string;
}

export interface DashboardStats {
  totalCommands: number;
  inProgress: number;
  completed: number;
  delayed: number;
  revenue: number;
  averageProductionTime: number;
}

export interface Client {
  _id: string;
  id: string;
  nomSociete: string;
  personneContact: {
    nom: string;
    prenom: string;
  };
  email: string;
  telephone?: string;
  adresse?: string;
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