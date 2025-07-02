import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertTriangle, Loader2, RefreshCw, Wifi, WifiOff, Bell } from 'lucide-react';
import { CommandCard } from './CommandCard';
import { CommandDetail } from './CommandDetail';
import { Command, CommandStatus } from '../../types';
import { CommandForm } from './CommandForm';
import { CommandsProvider, useCommandsContext } from './CommandsContext';
import { SocketSyncProvider } from './SocketSyncProvider';
import { FILTER_STATUS_OPTIONS, getStatusLabel } from '../../utils/statusConfig';
import { COMMAND_EVENTS } from '../../utils/syncEvents';

const CommandsListContent: React.FC = () => {
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  
  const { commands, loading, error, createCommand, refetch, lastUpdate, forceRefresh } = useCommandsContext();

  // Écouter les événements de synchronisation pour l'indicateur
  useEffect(() => {
    const handleCommandUpdate = () => {
      setShowUpdateIndicator(true);
      setTimeout(() => setShowUpdateIndicator(false), 2000);
    };

    window.addEventListener(COMMAND_EVENTS.UPDATE, handleCommandUpdate);
    window.addEventListener(COMMAND_EVENTS.CREATE, handleCommandUpdate);
    window.addEventListener(COMMAND_EVENTS.DELETE, handleCommandUpdate);

    // Nettoyer les écouteurs
    return () => {
      window.removeEventListener(COMMAND_EVENTS.UPDATE, handleCommandUpdate);
      window.removeEventListener(COMMAND_EVENTS.CREATE, handleCommandUpdate);
      window.removeEventListener(COMMAND_EVENTS.DELETE, handleCommandUpdate);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="mt-1 text-sm text-gray-600">
            Gérez vos commandes de production
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Indicateur de synchronisation */}
          <div className="flex items-center space-x-2">
            {showUpdateIndicator ? (
              <div className="flex items-center text-green-600">
                <Wifi className="h-4 w-4 animate-pulse" />
                <span className="text-sm">Synchronisé</span>
              </div>
            ) : (
              <div className="flex items-center text-gray-500">
                <Wifi className="h-4 w-4" />
                <span className="text-sm">En ligne</span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle commande
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
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
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Chargement des commandes...</span>
        </div>
      )}

      {/* Results */}
      {!loading && (
        <div className="text-sm text-gray-600">
          {commands.length} commande{commands.length > 1 ? 's' : ''} trouvée{commands.length > 1 ? 's' : ''}
        </div>
      )}

      {/* Commands Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {commands.map((command, index) => (
            <CommandCard
              key={command.id || command._id || `temp-${index}-${command.numero || Date.now()}`}
              command={command}
              onSelect={setSelectedCommand}
              onStatusChange={(updatedCommand) => {
                // La synchronisation se fait automatiquement via les événements
                console.log('Statut mis à jour:', updatedCommand.numero, updatedCommand.statut);
              }}
            />
          ))}
        </div>
      )}

      {!loading && commands.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">Aucune commande trouvée</div>
          <p className="text-gray-500">Essayez de modifier vos critères de recherche</p>
        </div>
      )}

      {/* Command Detail Modal */}
      {selectedCommand && (
        <CommandDetail
          command={selectedCommand}
          onClose={() => setSelectedCommand(null)}
        />
      )}
      
      {/* Modal de création de commande */}
      {showCreateModal && (
        <div 
          className="fixed bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
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
        >
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <CommandForm
              onSubmit={async (data) => {
                try {
                  await createCommand({
                    ...data,
                    dateCreation: new Date().toISOString(),
                    progression: 0,
                  });
                  setShowCreateModal(false);
                  // La synchronisation se fait automatiquement
                } catch (e) {
                  alert('Erreur lors de la création de la commande');
                }
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export const CommandsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <SocketSyncProvider>
      <CommandsProvider filters={{ status: statusFilter, search: debouncedSearchTerm }}>
        <CommandsListContent />
      </CommandsProvider>
    </SocketSyncProvider>
  );
};