import { io, Socket } from 'socket.io-client';

// Configuration Socket.IO
export const SOCKET_CONFIG = {
  // URL du serveur Socket.IO - peut être configurée selon l'environnement
  SERVER_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001',
  
  // Options de connexion
  CONNECTION_OPTIONS: {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    // Suppression de forceNew pour éviter les connexions multiples
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  }
};

// Singleton pour la connexion Socket.IO
let socketInstance: Socket | null = null;

export const getSocketInstance = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_CONFIG.SERVER_URL, SOCKET_CONFIG.CONNECTION_OPTIONS);
    socketInstance.on('connect', () => {
      // ...
    });
    socketInstance.on('disconnect', () => {
      // ...
    });
    socketInstance.on('connect_error', (error) => {
      // ...
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    console.log('🔌 Fermeture de la connexion Socket.IO');
    socketInstance.disconnect();
    socketInstance = null;
  }
}; 