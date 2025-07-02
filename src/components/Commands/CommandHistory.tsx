import React, { useState, useEffect } from 'react';
import { commandsApi } from '../../services/api';
import { Clock, User, Edit, Trash2, CheckCircle, AlertCircle, Settings, Mail } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '../../config/socket';

interface HistoryEvent {
  _id: string;
  user: {
    _id: string;
    nom: string;
  } | null;
  action: string;
  changes: {
    previousStatus?: string;
    newStatus?: string;
    from?: string;
    to?: string;
    message?: string;
    [key: string]: any;
  };
  timestamp: string;
  mailSent?: boolean;
}

interface CommandHistoryProps {
  commandId: string;
}

// Fonction pour traduire les statuts
const translateStatus = (status: string): string => {
  const statusTranslations: { [key: string]: string } = {
    'draft': 'Brouillon',
    'validated': 'Validée',
    'in-production': 'En production',
    'quality-check': 'Contrôle qualité',
    'ready': 'Prête',
    'shipped': 'Expédiée',
    'delivered': 'Livrée',
    'canceled': 'Annulée',
    'pending': 'En attente',
    'in-progress': 'En cours',
    'completed': 'Terminée',
    'blocked': 'Bloquée'
  };
  return statusTranslations[status] || status;
};

const formatAction = (action: string, changes: any): string => {
  switch (action) {
    case 'UPDATE_STATUS':
      const previousStatus = changes?.previousStatus || changes?.from;
      const newStatus = changes?.newStatus || changes?.to;
      return `a changé le statut de <span class="font-semibold text-gray-600">${translateStatus(previousStatus || 'inconnu')}</span> à <span class="font-semibold text-green-600">${translateStatus(newStatus || 'inconnu')}</span>`;
    case 'SEND_STATUS_MAIL':
      return changes?.message || 'a envoyé un email de notification au client';
    case 'CREATE_COMMAND':
      return 'a créé la commande';
    
    case 'UPDATE_COMMAND':
      return changes?.message || 'a mis à jour les informations de la commande';
    
    case 'DELETE_COMMAND':
      return 'a supprimé la commande';
    
    case 'ASSIGN_STEP':
      return changes?.message || 'a assigné une étape';
    
    case 'UPDATE_STEP_STATUS':
      // Traduire les statuts dans le message si présent
      if (changes?.message) {
        let translatedMessage = changes.message;
        // Remplacer les statuts en anglais par leurs traductions
        Object.entries({
          'pending': 'En attente',
          'in-progress': 'En cours',
          'completed': 'Terminée',
          'blocked': 'Bloquée'
        }).forEach(([en, fr]) => {
          translatedMessage = translatedMessage.replace(new RegExp(en, 'g'), fr);
        });
        return translatedMessage;
      }
      return 'a mis à jour le statut d\'une étape';
    
    case 'COMPLETE_STEP':
      return changes?.message || 'a terminé une étape';
    
    default:
      return changes?.message || 'a effectué une action inconnue';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Fonction pour obtenir l'icône selon l'action
const getActionIcon = (action: string) => {
  switch (action) {
    case 'CREATE_COMMAND':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'UPDATE_STATUS':
      return <Settings className="h-5 w-5 text-blue-500" />;
    case 'UPDATE_COMMAND':
      return <Edit className="h-5 w-5 text-yellow-500" />;
    case 'DELETE_COMMAND':
      return <Trash2 className="h-5 w-5 text-red-500" />;
    case 'ASSIGN_STEP':
    case 'UPDATE_STEP_STATUS':
    case 'COMPLETE_STEP':
      return <User className="h-5 w-5 text-purple-500" />;
    case 'SEND_STATUS_MAIL':
      return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8V8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>;
    default:
      return <Clock className="h-5 w-5 text-gray-400" />;
  }
};

export const CommandHistory: React.FC<CommandHistoryProps> = ({ commandId }) => {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showAll, setShowAll] = useState(false);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const data = await commandsApi.getHistory(commandId);
      setHistory(data);
      setError(null);
    } catch (err) {
      setError('Impossible de charger l\'historique.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (commandId) {
      fetchHistory();
    }
  }, [commandId]);

  // Initialiser Socket.IO et écouter les événements
  useEffect(() => {
    // Initialiser la connexion Socket.IO
    const newSocket = io(SOCKET_CONFIG.SERVER_URL, SOCKET_CONFIG.CONNECTION_OPTIONS);
    setSocket(newSocket);

    // Événement de connexion
    newSocket.on('connect', () => {
      console.log('🔌 CommandHistory connecté au serveur Socket.IO');
    });

    // Écouter les événements de mise à jour de commandes
    newSocket.on('COMMAND_UPDATED', (data: { commandId: string; updates: any }) => {
      console.log('📡 CommandHistory - Événement COMMAND_UPDATED reçu:', data);
      if (data.commandId === commandId) {
        fetchHistory();
      }
    });

    newSocket.on('STATUS_CHANGED', (data: { commandId: string; newStatus: string; progression: number }) => {
      console.log('📡 CommandHistory - Événement STATUS_CHANGED reçu:', data);
      if (data.commandId === commandId) {
        fetchHistory();
      }
    });

    newSocket.on('STEP_UPDATED', (data: { commandId: string; stepId: string; updates: any }) => {
      console.log('📡 CommandHistory - Événement STEP_UPDATED reçu:', data);
      if (data.commandId === commandId) {
        fetchHistory();
      }
    });

    newSocket.on('COMMAND_FULLY_UPDATED', (data: { command: any }) => {
      console.log('📡 CommandHistory - Événement COMMAND_FULLY_UPDATED reçu:', data);
      const commandIdFromEvent = data.command._id || data.command.id;
      if (commandIdFromEvent === commandId) {
        fetchHistory();
      }
    });

    // Nettoyer lors du démontage
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [commandId]);

  if (isLoading) {
    return <div>Chargement de l'historique...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  const initialLimit = 2;

  return (
    <div className="mt-6">
      <h4 className="text-lg font-medium text-gray-900 mb-4">Historique des modifications</h4>
      {history.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune modification enregistrée pour cette commande.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {history.slice(0, initialLimit).map((event) => (
              <li key={event._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {getActionIcon(event.action)}
                </div>
                <div className="flex-1">
                  <p 
                    className="text-sm text-gray-700 flex items-center gap-2"
                    dangerouslySetInnerHTML={{ __html: `<span class=\"font-bold text-gray-900\">${event.user?.nom || 'Système'}</span> ${formatAction(event.action, event.changes)}.` }}
                  >
                  </p>
                  {event.mailSent && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 mt-1">
                      <Mail className="h-4 w-4" />
                      Mail envoyé au client
                    </span>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showAll ? 'max-h-[1000px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
            <ul className="space-y-4">
              {history.slice(initialLimit).map((event) => (
                <li key={event._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0">
                    {getActionIcon(event.action)}
                  </div>
                  <div className="flex-1">
                    <p 
                      className="text-sm text-gray-700 flex items-center gap-2"
                      dangerouslySetInnerHTML={{ __html: `<span class=\"font-bold text-gray-900\">${event.user?.nom || 'Système'}</span> ${formatAction(event.action, event.changes)}.` }}
                    >
                    </p>
                    {event.mailSent && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 mt-1">
                        <Mail className="h-4 w-4" />
                        Mail envoyé au client
                      </span>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{formatDate(event.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {history.length > initialLimit && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors duration-200"
              >
                {showAll ? 'Voir moins' : `Voir plus (${history.length - initialLimit} de plus)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}; 