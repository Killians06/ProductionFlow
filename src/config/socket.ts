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

// Fonction pour authentifier le socket
const authenticateSocket = (socket: Socket) => {
  const token = localStorage.getItem('token');
  if (token) {
    console.log('🔐 Authentification socket avec token...');
    socket.emit('authenticate', { token });
  } else {
    console.warn('⚠️ Aucun token trouvé pour l\'authentification socket');
  }
};

export const getSocketInstance = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_CONFIG.SERVER_URL, SOCKET_CONFIG.CONNECTION_OPTIONS);
    
    socketInstance.on('connect', () => {
      console.log('🔌 Connecté au serveur Socket.IO');
      
      // Authentifier automatiquement avec le token JWT
      authenticateSocket(socketInstance!);
    });
    
    socketInstance.on('authenticated', (data) => {
      console.log('✅ Socket authentifié:', data.organisation);
    });
    
    socketInstance.on('auth_error', (error) => {
      console.error('❌ Erreur d\'authentification socket:', error.message);
    });
    
    socketInstance.on('disconnect', () => {
      console.log('🔌 Déconnecté du serveur Socket.IO');
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion Socket.IO:', error);
    });
    
    // Authentifier aussi lors des reconnexions
    socketInstance.on('reconnect', () => {
      console.log('🔄 Reconnexion au serveur Socket.IO');
      authenticateSocket(socketInstance!);
    });
  }
  return socketInstance;
};

// Fonction pour forcer la réauthentification (utile après login)
export const reauthenticateSocket = () => {
  if (socketInstance && socketInstance.connected) {
    console.log('🔄 Réauthentification forcée du socket...');
    authenticateSocket(socketInstance);
  }
};

export const disconnectSocket = () => {
  if (socketInstance) {
    console.log('🔌 Fermeture de la connexion Socket.IO');
    socketInstance.disconnect();
    socketInstance = null;
  }
}; 