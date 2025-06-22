import React, { createContext, useState, useCallback, useContext } from 'react';
import { CommandStatus } from '../types';

export type NotificationType = 'success' | 'error' | 'info' | 'status_update';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  status?: CommandStatus;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (message: string, type?: NotificationType, status?: CommandStatus) => void;
  removeNotification: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType = 'success', status?: CommandStatus) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type, status }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}; 