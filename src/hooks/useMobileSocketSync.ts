import { useEffect, useRef } from 'react';
import { getSocketInstance } from '../config/socket';

// Hook pour la synchronisation mobile avec WebSocket public (sans authentification)
export const useMobileSocketSync = (refetch?: (source?: string) => void, commandId?: string) => {
  const socketRef = useRef<any>(null);
  const isConnected = useRef(false);

  useEffect(() => {
    if (!commandId) return;

    console.log('📱 Page mobile - Connexion WebSocket publique pour commande:', commandId);
    
    // Utiliser le singleton Socket.IO
    const socket = getSocketInstance();
    socketRef.current = socket;

    // Événement de connexion
    socket.on('connect', () => {
      console.log('📱 Page mobile - Connecté au serveur WebSocket');
      isConnected.current = true;
      
      // Rejoindre la room publique pour cette commande
      socket.emit('join_public', { commandId });
    });

    // Événement de déconnexion
    socket.on('disconnect', () => {
      console.log('📱 Page mobile - Déconnecté du serveur WebSocket');
      isConnected.current = false;
    });

    // Événement de connexion publique réussie
    socket.on('public_joined', (data) => {
      console.log('📱 Page mobile - Connecté en mode public:', data);
    });

    // Événement d'erreur de connexion publique
    socket.on('public_error', (error) => {
      console.error('📱 Page mobile - Erreur connexion publique:', error.message);
    });

    // Écouter les événements de mise à jour de commande
    const syncEvents = [
      'COMMAND_FULLY_UPDATED',
      'COMMAND_UPDATED',
      'STATUS_CHANGED'
    ];
    
    syncEvents.forEach(event => {
      socket.on(event, (data: any) => {
        console.log(`📱 Page mobile - Événement ${event} reçu:`, data);
        
        // Vérifier que l'événement concerne notre commande
        let eventCommandId = null;
        
        if (event === 'COMMAND_FULLY_UPDATED') {
          eventCommandId = data?.command?._id || data?.command?.id || data?.command?.commandId;
        } else {
          eventCommandId = data?.commandId;
        }
        
        if (eventCommandId && (
          eventCommandId === commandId || 
          eventCommandId.toString() === commandId ||
          commandId === eventCommandId.toString()
        )) {
          console.log(`📱 Page mobile - Mise à jour déclenchée par ${event}`);
          if (refetch) {
            refetch('socket');
          }
        }
      });
    });

    // Si déjà connecté, rejoindre immédiatement
    if (socket.connected) {
      socket.emit('join_public', { commandId });
    }

    return () => {
      console.log('📱 Page mobile - Nettoyage WebSocket');
      syncEvents.forEach(event => socket.off(event));
      socket.off('connect');
      socket.off('disconnect');
      socket.off('public_joined');
      socket.off('public_error');
    };
  }, [commandId, refetch]);

  // Fonction pour forcer un rafraîchissement manuel
  const forceRefresh = () => {
    if (refetch) {
      console.log('📱 Page mobile - Rafraîchissement forcé');
      refetch('manual');
    }
  };

  return { forceRefresh };
}; 