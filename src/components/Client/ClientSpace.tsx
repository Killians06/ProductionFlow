import React, { useState } from 'react';
import { Search, Eye, MessageCircle, Download, Loader2, AlertTriangle, X } from 'lucide-react';
import { Command } from '../../types';
import { useCommands } from '../../hooks/useCommands';
import { getStatusLabel, getStatusColor } from '../../utils/statusUtils';
import { formatDate } from '../../utils/dateUtils';

export const ClientSpace: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCommand, setSelectedCommand] = useState<Command | null>(null);

  const { commands, loading, error } = useCommands({
    search: searchTerm,
  });

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur de chargement</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Espace Client</h2>
        <p className="mt-1 text-sm text-gray-600">
          Interface client pour le suivi des commandes
        </p>
      </div>

      {/* Client Login Simulation */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Mode démo - Espace Client
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Connecté en tant que: <strong>Société ABC</strong></p>
              <p>Dans un environnement réel, les clients accèdent via un lien sécurisé ou un login dédié.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher mes commandes..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Chargement de vos commandes...</span>
        </div>
      )}

      {/* Commands List for Client */}
      {!loading && (
        <div className="grid gap-4">
          {commands.map(command => (
            <div key={command.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Commande {command.numero}
                  </h3>
                  <div className="text-sm text-gray-500 mb-2">
                    Créée le {formatDate(new Date(command.dateCreation))}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(command.statut)}`}>
                    {getStatusLabel(command.statut)}
                  </span>
                  <button 
                    onClick={() => setSelectedCommand(command)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
                  >
                    <Eye className="h-4 w-4 inline mr-1" />
                    Voir détails
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progression de votre commande</span>
                  <span>{command.progression}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      command.progression === 100 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${command.progression}%` }}
                  />
                </div>
              </div>

              {/* Key Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Produits:</span>
                  <div className="font-medium">{command.produits.length} article{command.produits.length > 1 ? 's' : ''}</div>
                </div>
                <div>
                  <span className="text-gray-500">Livraison prévue:</span>
                  <div className="font-medium">{formatDate(new Date(command.dateLivraison))}</div>
                </div>
                <div>
                  <span className="text-gray-500">Étapes:</span>
                  <div className="font-medium">
                    {command.etapesProduction.filter(e => e.statut === 'completed').length} / {command.etapesProduction.length} terminées
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200">
                <button className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Contacter
                </button>
                <button className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200">
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && commands.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">Aucune commande trouvée</div>
          <p className="text-gray-500">Essayez de modifier votre recherche</p>
        </div>
      )}

      {/* Detailed View Modal */}
      {selectedCommand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Commande {selectedCommand.numero}</h2>
                <button 
                  onClick={() => setSelectedCommand(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Status */}
              <div className="mb-6">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    selectedCommand.statut === 'delivered' ? 'bg-green-500' :
                    selectedCommand.statut === 'in-production' ? 'bg-blue-500' :
                    selectedCommand.statut === 'canceled' ? 'bg-red-500' :
                    'bg-gray-300'
                  }`} />
                  <span className="text-sm font-medium text-gray-900">
                    {selectedCommand.statut === 'delivered' ? 'Terminée' :
                     selectedCommand.statut === 'in-production' ? 'En production' :
                     selectedCommand.statut === 'canceled' ? 'Annulée' :
                     'En attente'}
                  </span>
                </div>
              </div>

              {/* Products */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Vos produits</h4>
                <div className="space-y-2">
                  {selectedCommand.produits.map((produit, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <div className="font-medium">{produit.nom}</div>
                        {produit.specifications && (
                          <div className="text-sm text-gray-500">{produit.specifications}</div>
                        )}
                      </div>
                      <div className="text-sm font-medium">Qté: {produit.quantite}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Production Steps (simplified for client) */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Étapes de production</h4>
                <div className="space-y-3">
                  {selectedCommand.etapesProduction.map((etape, index) => (
                    <div key={etape._id} className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        etape.statut === 'completed' ? 'bg-green-500' :
                        etape.statut === 'in-progress' ? 'bg-blue-500' :
                        etape.statut === 'blocked' ? 'bg-red-500' :
                        'bg-gray-300'
                      }`} />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{etape.nom}</div>
                        <div className="text-xs text-gray-500">{etape.description}</div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded ${
                        etape.statut === 'completed' ? 'bg-green-100 text-green-800' :
                        etape.statut === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                        etape.statut === 'blocked' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {etape.statut === 'completed' ? 'Terminée' :
                         etape.statut === 'in-progress' ? 'En cours' :
                         etape.statut === 'blocked' ? 'Bloquée' :
                         'En attente'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-gray-50 rounded-md p-4">
                <h4 className="font-medium text-gray-900 mb-2">Une question sur votre commande ?</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Notre équipe est disponible pour répondre à toutes vos questions.
                </p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors duration-200">
                  Nous contacter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};