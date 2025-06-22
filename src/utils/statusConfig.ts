import { CommandStatus } from '../types';
import { Bell, CheckCircle, Package, Search, Truck, Zap, XCircle } from 'lucide-react';

export interface StatusOption {
  value: CommandStatus;
  label: string;
  description: string;
  color: string;
}

// Configuration centralisée des statuts
export const COMMAND_STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'draft' as CommandStatus,
    label: 'Brouillon',
    description: 'Commande en cours de création',
    color: 'bg-gray-100 text-gray-800'
  },
  {
    value: 'pending' as CommandStatus,
    label: 'En attente',
    description: 'Commande en attente de traitement',
    color: 'bg-gray-100 text-gray-800'
  },
  {
    value: 'validated' as CommandStatus,
    label: 'Validée',
    description: 'Commande validée et prête pour la production',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    value: 'in-production' as CommandStatus,
    label: 'En production',
    description: 'Commande en phase de production active',
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    value: 'quality-check' as CommandStatus,
    label: 'Contrôle qualité',
    description: 'Commande en contrôle qualité',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    value: 'ready' as CommandStatus,
    label: 'Prête',
    description: 'Commande prête pour expédition',
    color: 'bg-green-100 text-green-800'
  },
  {
    value: 'shipped' as CommandStatus,
    label: 'Expédiée',
    description: 'Commande expédiée au client',
    color: 'bg-indigo-100 text-indigo-800'
  },
  {
    value: 'delivered' as CommandStatus,
    label: 'Livrée',
    description: 'Commande livrée au client',
    color: 'bg-emerald-100 text-emerald-800'
  },
  {
    value: 'canceled' as CommandStatus,
    label: 'Annulée',
    description: 'Commande annulée',
    color: 'bg-red-100 text-red-800'
  }
];

// Options simplifiées pour la page mobile (sans les statuts administratifs)
// Sur mobile, "in-progress" est remplacé par "in-production"
export const MOBILE_STATUS_OPTIONS: StatusOption[] = [
  {
    value: 'pending' as CommandStatus,
    label: 'En attente',
    description: 'Commande en attente de traitement',
    color: 'bg-gray-100 text-gray-800'
  },
  {
    value: 'in-production' as CommandStatus,
    label: 'En production',
    description: 'Commande en phase de production active',
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    value: 'ready' as CommandStatus,
    label: 'Prête',
    description: 'Commande prête pour expédition',
    color: 'bg-green-100 text-green-800'
  },
  {
    value: 'shipped' as CommandStatus,
    label: 'Expédiée',
    description: 'Commande expédiée au client',
    color: 'bg-indigo-100 text-indigo-800'
  },
  {
    value: 'delivered' as CommandStatus,
    label: 'Livrée',
    description: 'Commande livrée au client',
    color: 'bg-emerald-100 text-emerald-800'
  }
];

// Options pour les filtres (avec "Tous les statuts")
export const FILTER_STATUS_OPTIONS = [
  { value: 'all' as const, label: 'Tous les statuts' },
  ...COMMAND_STATUS_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }))
];

// Fonction utilitaire pour obtenir une option de statut
export const getStatusOption = (status: CommandStatus): StatusOption | undefined => {
  return COMMAND_STATUS_OPTIONS.find(option => option.value === status);
};

// Fonction utilitaire pour obtenir le label d'un statut
export const getStatusLabel = (status: CommandStatus): string => {
  const option = getStatusOption(status);
  return option?.label || status;
};

// Fonction utilitaire pour obtenir la couleur d'un statut
export const getStatusColor = (status: CommandStatus): string => {
  const option = getStatusOption(status);
  return option?.color || 'bg-gray-100 text-gray-800';
}; 