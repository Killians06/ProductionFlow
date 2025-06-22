import React from 'react';
import { useSocketSync } from '../../hooks/useSocketSync';

interface SocketSyncProviderProps {
  children: React.ReactNode;
}

export const SocketSyncProvider: React.FC<SocketSyncProviderProps> = ({ children }) => {
  // Initialiser la synchronisation Socket.IO
  useSocketSync();
  
  return <>{children}</>;
}; 