import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { User } from '../../types';
import { NotificationContainer } from './NotificationContainer';
import { GlobalEventNotifications } from './GlobalEventNotifications';
import { CommandsProvider } from '../Commands/CommandsContext';
import { SocketSyncProvider } from '../Commands/SocketSyncProvider';

interface MainLayoutProps {
  user: User | null;
  onLogout: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ user, onLogout }) => {
  return (
    // Les providers de commandes et de socket sont nécessaires pour les notifications globales
    <CommandsProvider>
      <SocketSyncProvider>
        <div className="min-h-screen bg-gray-50">
          <Header user={user} onLogout={onLogout} />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet context={{ user }} />
          </main>
          <NotificationContainer />
          <GlobalEventNotifications />
        </div>
      </SocketSyncProvider>
    </CommandsProvider>
  );
}; 