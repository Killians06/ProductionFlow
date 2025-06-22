import React, { useState, useEffect } from 'react';
import { clientService, Client } from '../services/clientService';
import { toast } from 'react-toastify';

interface ClientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onClientSelect: (client: Client | null) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ value, onChange, onClientSelect }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nomSociete: '',
    personneContact: { nom: '', prenom: '', fonction: '' },
    email: '',
    telephone: '',
    adresse: { rue: '', codePostal: '', ville: '', pays: 'France' }
  });

  useEffect(() => {
    if (showDropdown) {
      loadClients();
    }
  }, [searchTerm, showDropdown]);

  const loadClients = async () => {
    try {
      setLoading(true);
      console.log('Chargement des clients avec searchTerm:', searchTerm);
      const data = await clientService.getClients(searchTerm, true);
      console.log('Clients chargés:', data);
      setClients(data);
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: Client) => {
    console.log('Client sélectionné:', client);
    onChange(client._id);
    onClientSelect(client);
    setShowDropdown(false);
    setSearchTerm('');
  };

  const handleCreateClient = async () => {
    console.log('Tentative de création de client avec données:', newClientData);
    try {
      const newClient = await clientService.createClient(newClientData);
      console.log('Client créé avec succès:', newClient);
      toast.success('Client créé avec succès');
      setNewClientData({
        nomSociete: '',
        personneContact: { nom: '', prenom: '', fonction: '' },
        email: '',
        telephone: '',
        adresse: { rue: '', codePostal: '', ville: '', pays: 'France' }
      });
      setShowNewClientForm(false);
      loadClients();
      // Sélectionner automatiquement le nouveau client
      handleClientSelect(newClient);
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
      toast.error('Erreur lors de la création du client');
    }
  };

  const updateNewClientData = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setNewClientData(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [child]: value }
      }));
    } else {
      setNewClientData(prev => ({ ...prev, [field]: value }));
    }
  };

  const selectedClient = clients.find(client => client._id === value);

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">Client</label>
      
      {/* Champ de sélection */}
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher ou sélectionner un client..."
          value={selectedClient ? `${selectedClient.nomSociete} - ${selectedClient.personneContact.prenom} ${selectedClient.personneContact.nom}` : searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!showDropdown) setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="w-full p-2 border border-gray-300 rounded"
        />
        
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              onClientSelect(null);
              setSearchTerm('');
            }}
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown avec liste des clients */}
      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-2 text-center text-gray-500">Chargement...</div>
          ) : (
            <>
              {/* Bouton pour créer un nouveau client */}
              <button
                type="button"
                onClick={() => {
                  console.log('Ouverture du formulaire de création de client');
                  setShowNewClientForm(true);
                }}
                className="w-full p-2 text-left text-blue-600 hover:bg-blue-50 border-b border-gray-200"
              >
                + Créer un nouveau client
              </button>
              
              {/* Liste des clients */}
              {clients.map((client) => (
                <button
                  key={client._id}
                  type="button"
                  onClick={() => handleClientSelect(client)}
                  className="w-full p-2 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                >
                  <div className="font-medium">{client.nomSociete}</div>
                  <div className="text-sm text-gray-600">
                    {client.personneContact.prenom} {client.personneContact.nom}
                    {client.personneContact.fonction && ` - ${client.personneContact.fonction}`}
                  </div>
                  <div className="text-sm text-gray-500">{client.email}</div>
                </button>
              ))}
              
              {clients.length === 0 && searchTerm && (
                <div className="p-2 text-center text-gray-500">
                  Aucun client trouvé
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Formulaire de création rapide */}
      {showNewClientForm && (
        <div 
          className="fixed bg-black bg-opacity-50 flex items-center justify-center z-50" 
          style={{ 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            margin: 0, 
            padding: '1rem',
            width: '100vw',
            height: '100vh',
            position: 'fixed'
          }}
        >
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Nouveau client</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Nom de société *</label>
                <input
                  type="text"
                  value={newClientData.nomSociete}
                  onChange={(e) => updateNewClientData('nomSociete', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={newClientData.email}
                  onChange={(e) => updateNewClientData('email', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Prénom *</label>
                  <input
                    type="text"
                    value={newClientData.personneContact.prenom}
                    onChange={(e) => updateNewClientData('personneContact.prenom', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nom *</label>
                  <input
                    type="text"
                    value={newClientData.personneContact.nom}
                    onChange={(e) => updateNewClientData('personneContact.nom', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  type="text"
                  value={newClientData.telephone}
                  onChange={(e) => updateNewClientData('telephone', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCreateClient}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Créer
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewClientForm(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fermer le dropdown quand on clique ailleurs */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default ClientSelector; 