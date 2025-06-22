import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { User } from '../../types';
import { User as UserIcon, Mail, Briefcase, Calendar } from 'lucide-react';

interface OutletContextType {
  user: User | null;
}

export const MyAccount = () => {
  const { user } = useOutletContext<OutletContextType>();

  if (!user) {
    return <div>Chargement des informations du compte...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Mon Compte</h1>
          <p className="mt-1 text-sm text-gray-500">Gérez vos informations personnelles et vos paramètres.</p>
        </div>
        
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Informations du profil</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-sm font-medium text-gray-600 w-32">Nom complet</span>
              <span className="text-sm text-gray-900">{user.nom}</span>
            </div>
            <div className="flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-sm font-medium text-gray-600 w-32">Adresse e-mail</span>
              <span className="text-sm text-gray-900">{user.email}</span>
            </div>
            {user.organisation && (
              <div className="flex items-center">
                <Briefcase className="h-5 w-5 text-gray-400 mr-3" />
                <span className="text-sm font-medium text-gray-600 w-32">Organisation</span>
                <span className="text-sm text-gray-900">{user.organisation.nom}</span>
              </div>
            )}
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
              <span className="text-sm font-medium text-gray-600 w-32">Rôle</span>
              <span className="text-sm text-gray-900 capitalize">{user.role || 'Non spécifié'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 