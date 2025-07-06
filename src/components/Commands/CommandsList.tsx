import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, AlertTriangle, Loader2, RefreshCw, Wifi, WifiOff, Bell, LayoutGrid, List as ListIcon } from 'lucide-react';
import { CommandCard } from './CommandCard';
import { CommandDetail } from './CommandDetail';
import { Command, CommandStatus } from '../../types';
import { CommandForm } from './CommandForm';
import { CommandsProvider, useCommandsContext } from './CommandsContext';
import { SocketSyncProvider } from './SocketSyncProvider';
import { FILTER_STATUS_OPTIONS, getStatusLabel } from '../../utils/statusConfig';
import { COMMAND_EVENTS } from '../../utils/syncEvents';
import { CommandsTable } from './CommandsTable';

interface CommandsListContentProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  viewMode: 'cards' | 'table';
  setViewMode: (v: 'cards' | 'table') => void;
}
const CommandsListContent: React.FC<CommandsListContentProps> = ({ searchTerm, setSearchTerm, viewMode, setViewMode }) => {
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  
  const { commands, loading, error, createCommand, refetch, lastUpdate, forceRefresh } = useCommandsContext();

  // Fonction pour fermer le modal avec animation
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setSelectedCommand(null);
      setIsClosing(false);
    }, 300); // Durée de l'animation de fermeture
  };

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
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-2 w-full sm:w-auto">
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
          {/* Toggle cards/table */}
          <div className="flex items-center space-x-1">
            <button
              className={`p-2 rounded-md border ${viewMode === 'cards' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-400'} transition-colors`}
              title="Vue cartes"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              className={`p-2 rounded-md border ${viewMode === 'table' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-300 text-gray-400'} transition-colors`}
              title="Vue tableau"
              onClick={() => setViewMode('table')}
            >
              <ListIcon className="h-5 w-5" />
            </button>
          </div>
          {/* Barre de recherche compacte */}
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-gray-400" />
            </span>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
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

      {/* Commands Grid ou Table */}
      {!loading && viewMode === 'cards' && (
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
      {!loading && viewMode === 'table' && (
        <CommandsTable
          commands={commands}
          onSelect={setSelectedCommand}
        />
      )}

      {!loading && commands.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">Aucune commande trouvée</div>
          <p className="text-gray-500">Essayez de modifier vos critères de recherche</p>
        </div>
      )}

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

const VIEW_KEY = 'commands_view_mode';

export const CommandsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    return (localStorage.getItem(VIEW_KEY) as 'cards' | 'table') || 'cards';
  });

  useEffect(() => {
    localStorage.setItem(VIEW_KEY, viewMode);
  }, [viewMode]);

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
        <CommandsListContent searchTerm={searchTerm} setSearchTerm={setSearchTerm} viewMode={viewMode} setViewMode={setViewMode} />
      </CommandsProvider>
    </SocketSyncProvider>
  );
};