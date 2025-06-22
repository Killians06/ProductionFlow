import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Package, 
  Truck, 
  Home,
  Loader2,
  Mail,
  X
} from 'lucide-react';
import { Command, CommandStatus } from '../../types';
import { MOBILE_STATUS_OPTIONS } from '../../utils/statusConfig';
import { useMobileSocketSync } from '../../hooks/useMobileSocketSync';

const QuickStatusUpdate: React.FC = () => {
  const { commandId } = useParams<{ commandId: string }>();
  const [command, setCommand] = useState<Command | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<CommandStatus | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Initialiser la synchronisation Socket.IO
  const { socket } = useMobileSocketSync();

  useEffect(() => {
    const fetchCommand = async () => {
      if (!commandId) return;
      
      try {
        // Utiliser la route publique avec l'IP locale
        const response = await fetch(`http://192.168.1.98:5001/api/commands/${commandId}/quick-view`);
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement de la commande');
        }
        
        const data = await response.json();
        setCommand(data);
      } catch (err) {
        setError('Erreur lors du chargement de la commande');
      } finally {
        setLoading(false);
      }
    };

    fetchCommand();
  }, [commandId]);

  // Écouter les événements de synchronisation
  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = (data: { commandId: string; newStatus: string; progression: number }) => {
      console.log('📱 Page mobile - Événement STATUS_CHANGED reçu:', data);
      if (data.commandId === commandId && command) {
        setCommand(prev => prev ? { ...prev, statut: data.newStatus as CommandStatus, progression: data.progression } : null);
      }
    };

    socket.on('STATUS_CHANGED', handleStatusChanged);

    return () => {
      socket.off('STATUS_CHANGED', handleStatusChanged);
    };
  }, [socket, commandId, command]);

  // Fonction pour obtenir l'icône appropriée
  const getStatusIcon = (status: CommandStatus) => {
    switch (status) {
      case 'pending' as CommandStatus:
        return <Clock size={20} />;
      case 'in-production' as CommandStatus:
        return <Package size={20} />;
      case 'ready' as CommandStatus:
        return <CheckCircle size={20} />;
      case 'shipped' as CommandStatus:
        return <Truck size={20} />;
      case 'delivered' as CommandStatus:
        return <Home size={20} />;
      default:
        return <Clock size={20} />;
    }
  };

  const handleStatusUpdate = async (newStatus: CommandStatus) => {
    if (!command) return;
    
    // Stocker le statut en attente et afficher le modal
    setPendingStatus(newStatus);
    setShowNotificationModal(true);
  };

  const confirmStatusUpdate = async (notifyClient: boolean) => {
    if (!command || !pendingStatus) return;
    
    setUpdating(true);
    setShowNotificationModal(false);
    
    try {
      console.log('Envoi de la mise à jour:', { 
        commandId: command._id, 
        statut: pendingStatus, 
        notifyClient 
      });
      
      // Utiliser la route publique pour la mise à jour rapide avec l'IP locale
      const response = await fetch(`http://192.168.1.98:5001/api/commands/${command._id}/quick-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          statut: pendingStatus,
          progression: command.progression || 0,
          notifyClient: notifyClient
        })
      });

      console.log('Réponse du serveur:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur serveur:', errorData);
        throw new Error(`Erreur ${response.status}: ${errorData.error || errorData.details || response.statusText}`);
      }

      const result = await response.json();
      console.log('Résultat de la mise à jour:', result);
      
      setCommand(prev => prev ? { ...prev, statut: pendingStatus } : null);
      
      // Émettre l'événement Socket.IO pour synchroniser les autres fenêtres
      if (socket) {
        socket.emit('STATUS_CHANGED', {
          commandId: command._id,
          newStatus: pendingStatus,
          progression: command.progression || 0
        });
      }
      
      // Afficher un message de succès avec information sur l'email
      let message = 'Statut mis à jour avec succès !';
      if (notifyClient && result.emailSent) {
        message += ' Un email de notification a été envoyé au client.';
        setEmailSent(true);
      } else if (notifyClient && !result.emailSent) {
        message += ' Aucun email envoyé (client sans adresse email).';
      }
      
      setTimeout(() => {
        alert(message);
      }, 100);
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur lors de la mise à jour du statut: ${errorMessage}`);
    } finally {
      setUpdating(false);
      setPendingStatus(null);
    }
  };

  const cancelStatusUpdate = () => {
    setShowNotificationModal(false);
    setPendingStatus(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  if (error || !command) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Commande non trouvée'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ 
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'transparent'
    }}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.close()}
            className="p-2 text-gray-500 hover:text-gray-700"
            style={{ minWidth: '44px', minHeight: '44px' }} // Taille minimale pour le touch
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Mise à jour statut</h1>
          <div className="w-9"></div> {/* Spacer pour centrer le titre */}
        </div>
      </div>

      {/* Command Info */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              Commande #{command.numero}
            </h1>
          </div>

          {/* Indicateur d'email envoyé */}
          {emailSent && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg flex items-center gap-2">
              <Mail size={16} className="text-green-600" />
              <span className="text-green-700 text-sm">
                Email de notification envoyé au client
              </span>
            </div>
          )}

          {/* Informations client */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">Client</h2>
            <p className="text-gray-700">{command.client?.nom || 'Client non spécifié'}</p>
            {command.client?.email && (
              <p className="text-gray-500 text-sm">{command.client.email}</p>
            )}
          </div>

          {/* Status Options */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choisir le nouveau statut :</h3>
            
            {MOBILE_STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusUpdate(option.value)}
                disabled={updating || command.statut === option.value}
                className={`w-full p-4 bg-white rounded-lg border-2 transition-all duration-200 ${
                  command.statut === option.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                style={{ minHeight: '60px' }} // Taille minimale pour le touch
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    command.statut === option.value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getStatusIcon(option.value)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${
                      command.statut === option.value ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {option.label}
                    </p>
                    <p className={`text-sm ${
                      command.statut === option.value ? 'text-blue-700' : 'text-gray-500'
                    }`}>
                      {option.description}
                    </p>
                  </div>
                  {command.statut === option.value && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {updating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-700">Mise à jour en cours...</span>
            </div>
          </div>
        )}
      </div>

      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Notification client</h2>
              <button
                onClick={cancelStatusUpdate}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                Voulez-vous informer le client du changement de statut ?
              </p>
              <p className="text-sm text-gray-500">
                Un email sera envoyé automatiquement au client pour l'informer de la mise à jour.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => confirmStatusUpdate(true)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center gap-2"
              >
                <Mail size={16} />
                Oui, informer
              </button>
              <button
                onClick={() => confirmStatusUpdate(false)}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Non, pas maintenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickStatusUpdate; 