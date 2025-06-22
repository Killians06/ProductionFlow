import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_CONFIG } from '../config/socket';

export const useMobileSocketSync = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialiser la connexion Socket.IO
    socketRef.current = io(SOCKET_CONFIG.SERVER_URL, SOCKET_CONFIG.CONNECTION_OPTIONS);

    const socket = socketRef.current;

    // Événement de connexion
    socket.on('connect', () => {
      console.log('🔌 Page mobile connectée au serveur Socket.IO');
    });

    // Événement de déconnexion
    socket.on('disconnect', () => {
      console.log('🔌 Page mobile déconnectée du serveur Socket.IO');
    });

    // Nettoyage lors du démontage
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Fonction pour émettre des événements
  const emitEvent = (eventType: string, data: any) => {
    if (socketRef.current) {
      console.log(`📡 Page mobile - Émission événement ${eventType}:`, data);
      socketRef.current.emit(eventType, data);
    }
  };

  return { socket: socketRef.current };
}; 