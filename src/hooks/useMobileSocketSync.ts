import { useEffect } from 'react';
import { getSocketInstance } from '../config/socket';

// On attend une fonction refetch en paramètre et un commandId optionnel
export const useMobileSocketSync = (refetch?: () => void, commandId?: string) => {
  useEffect(() => {
    // Utiliser le singleton Socket.IO
    const socket = getSocketInstance();

    socket.on('connect', () => {
      console.log('🔌 Page mobile connectée au serveur Socket.IO');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Page mobile déconnectée du serveur Socket.IO');
    });

    // Synchronisation : dès qu'une commande change, on refetch
    const syncEvents = [
      'COMMAND_FULLY_UPDATED',
      'COMMAND_UPDATED',
      'COMMAND_CREATED',
      'COMMAND_DELETED',
      'STATUS_CHANGED'
    ];
    syncEvents.forEach(event => {
      socket.on(event, (data: any) => {
        let eventCommandId = data?.command?._id || data?.commandId;
        if (!commandId || (eventCommandId && eventCommandId === commandId)) {
          if (refetch) {
            refetch();
            console.log(`[QuickStatusUpdate] Rafraîchissement déclenché par événement temps réel: ${event} pour commande ${eventCommandId}`);
          }
        }
      });
    });

    return () => {
      syncEvents.forEach(event => socket.off(event));
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [commandId]);

  // Fonction pour émettre des événements
  const emitEvent = (eventType: string, data: any) => {
    const socket = getSocketInstance();
    if (socket) {
      console.log(`📡 Page mobile - Émission événement ${eventType}:`, data);
      socket.emit(eventType, data);
    }
  };

  return { socket: getSocketInstance(), emitEvent };
}; 