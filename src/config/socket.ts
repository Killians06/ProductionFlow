// Configuration Socket.IO
export const SOCKET_CONFIG = {
  // URL du serveur Socket.IO - peut être configurée selon l'environnement
  SERVER_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001',
  
  // Options de connexion
  CONNECTION_OPTIONS: {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true,
  }
}; 