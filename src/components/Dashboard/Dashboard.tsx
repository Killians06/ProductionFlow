import React from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Calendar,
  Loader2
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { useStats } from '../../hooks/useStats';
import { getStatusLabel, getStatusColor } from '../../utils/statusUtils';
import { formatDate, getDaysUntilDeadline } from '../../utils/dateUtils';
import { CommandDetail } from '../Commands/CommandDetail';
import { Command } from '../../types';

import { COMMAND_EVENTS } from '../../utils/syncEvents';

export const Dashboard: React.FC = () => {
  return <DashboardContent />;
};

const DashboardContent: React.FC = () => {
  const { data, loading, error, refetch: refetchStats } = useStats();
  const [selectedCommand, setSelectedCommand] = React.useState<Command | null>(null);
  const [isClosing, setIsClosing] = React.useState(false);

  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedCommand(null);
      setIsClosing(false);
    }, 300); // Durée de l'animation de fermeture
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Chargement des statistiques...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur de chargement</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recentCommands, urgentCommands } = data;

  return (
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="mt-1 text-sm text-gray-600">
            Vue d'ensemble de votre production
          </p>
        </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatsCard
            title="Commandes totales"
            value={stats.totalCommands}
            change={{ value: 12, positive: true }}
            icon={Package}
            color="blue"
          />
          <StatsCard
            title="En cours"
            value={stats.inProgress}
            icon={Clock}
            color="yellow"
          />
          <StatsCard
            title="Terminées"
            value={stats.completed}
            change={{ value: 8, positive: true }}
            icon={CheckCircle}
            color="green"
          />
          <StatsCard
            title="En retard"
            value={stats.delayed}
            icon={AlertTriangle}
            color="red"
          />
          <StatsCard
            title="Chiffre d'affaires"
            value={`${stats.revenue.toLocaleString('fr-FR')} €`}
            change={{ value: 15, positive: true }}
            icon={TrendingUp}
            color="purple"
          />
          <StatsCard
            title="Temps moyen"
            value={`${stats.averageProductionTime} jours`}
            icon={Calendar}
            color="blue"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Commands */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Commandes récentes
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {recentCommands
                .filter(command => command.id || (command as any)._id || command.numero)
                .map((command) => (
                  <div 
                    key={command.id || (command as any)._id || command.numero} 
                    className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                    onClick={() => setSelectedCommand(command)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {command.numero}
                        </p>
                        <p className="text-sm text-gray-500">
                          {command.client.nom}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(command.statut)}`}>
                          {getStatusLabel(command.statut)}
                        </span>
                        <div className="text-sm text-gray-500">
                        {formatDate(new Date(command.dateLivraison))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                        className={`h-2 rounded-full transition-all duration-500 ${command.progression === 100 ? 'bg-green-600' : 'bg-blue-600'}`}
                          style={{ width: `${command.progression}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Progression</span>
                      <span className={command.progression === 100 ? 'text-green-600 font-medium' : ''}>{command.progression}%</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Urgent Commands */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                Commandes urgentes
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {urgentCommands.length > 0 ? (
                urgentCommands
                  .filter(command => command.id || (command as any)._id || command.numero)
                  .map((command) => {
                  const daysLeft = getDaysUntilDeadline(new Date(command.dateLivraison));
                    return (
                      <div 
                        key={command.id || (command as any)._id || command.numero} 
                        className="px-6 py-4 hover:bg-red-50 transition-colors duration-150 cursor-pointer"
                        onClick={() => setSelectedCommand(command)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {command.numero}
                            </p>
                            <p className="text-sm text-gray-500">
                              {command.client.nom}
                            </p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              daysLeft < 0 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)} j de retard` : `${daysLeft} j restants`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
              <div className="px-6 py-8 text-center text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>Aucune commande urgente</p>
                </div>
              )}
            </div>
          </div>
        </div>

            {/* Command Detail Modal */}
      {selectedCommand && (
        <div 
          className={`fixed bg-black bg-opacity-0 flex items-center justify-center p-4 z-50 modal-backdrop ${isClosing ? 'modal-backdrop-closing' : ''}`}
          style={{ 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            margin: 0, 
            padding: '1rem',
            width: '100vw',
            height: '100vh',
            position: 'fixed'
          }}
          onClick={handleCloseModal}
        >
          <div className={`bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-content ${isClosing ? 'modal-content-closing' : ''}`} onClick={e => e.stopPropagation()}>
            <CommandDetail
              command={selectedCommand}
              onClose={handleCloseModal}
            />
          </div>
        </div>
      )}

      {/* Styles CSS pour l'animation du modal */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .modal-backdrop {
            animation: fadeIn 0.3s ease-out forwards;
          }
          
          .modal-content {
            animation: slideIn 0.3s ease-out forwards;
          }
          
          .modal-backdrop-closing {
            animation: fadeOut 0.3s ease-in forwards;
          }
          
          .modal-content-closing {
            animation: slideOut 0.3s ease-in forwards;
          }
          
          @keyframes fadeIn {
            from {
              background-color: rgba(0, 0, 0, 0);
            }
            to {
              background-color: rgba(0, 0, 0, 0.5);
            }
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(-20px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
          
          @keyframes fadeOut {
            from {
              background-color: rgba(0, 0, 0, 0.5);
            }
            to {
              background-color: rgba(0, 0, 0, 0);
            }
          }
          
          @keyframes slideOut {
            from {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
            to {
              opacity: 0;
              transform: scale(0.95) translateY(-20px);
            }
          }
        `
      }} />
    </div>
  );
};