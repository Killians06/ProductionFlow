import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, Settings, User as UserIcon, LogOut, ChevronDown } from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const location = useLocation();
  
  const navigationItems = [
    { id: 'dashboard', label: 'Tableau de bord', path: '/dashboard' },
    { id: 'commands', label: 'Commandes', path: '/commands' },
    { id: 'planning', label: 'Planning', path: '/planning' },
    { id: 'clients', label: 'Clients', path: '/clients' },
    { id: 'client', label: 'Espace client', path: '/client' },
    { id: 'organisation', label: 'Organisation', path: '/organisation' },
  ];

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link to="/dashboard" className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                ProductionFlow
              </Link>
            </div>
            <nav className="hidden md:ml-8 md:flex md:space-x-8">
              {navigationItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`${
                    isActiveRoute(item.path)
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors duration-200">
              <Bell className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors duration-200">
              <Settings className="h-5 w-5" />
            </button>

            <div className="relative">
              {user ? (
                <button 
                  className="flex items-center space-x-2 p-2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <span className="text-sm font-medium">{user.nom}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button className="p-2 text-gray-400 hover:text-gray-500 transition-colors duration-200">
                  <UserIcon className="h-5 w-5" />
                </button>
              )}

              {isUserMenuOpen && user && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50"
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <Link
                    to="/mon-compte"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    Mon Compte
                  </Link>
                  <button 
                    onClick={onLogout}
                    className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <nav className="md:hidden border-t border-gray-200">
        <div className="px-2 py-3 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={`${
                isActiveRoute(item.path)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } block px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors duration-200`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};