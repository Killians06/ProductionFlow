import { CommandStatus } from '../types';
import { getStatusLabel as getStatusLabelFromConfig, getStatusColor as getStatusColorFromConfig } from './statusConfig';

// Rediriger vers la configuration centralisée
export const getStatusLabel = getStatusLabelFromConfig;
export const getStatusColor = getStatusColorFromConfig;

export const getPriorityColor = (priority: 'low' | 'medium' | 'high'): string => {
  const colors = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-orange-100 text-orange-600',
    high: 'bg-red-100 text-red-600',
  };
  return colors[priority];
};

export const getPriorityLabel = (priority: 'low' | 'medium' | 'high'): string => {
  const labels = {
    low: 'Faible',
    medium: 'Normale',
    high: 'Urgente',
  };
  return labels[priority];
};