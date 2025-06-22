import React, { useState, useEffect } from 'react';
import { clientService, Client } from '../services/clientService';
import { toast } from 'react-toastify';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: {
    nomSociete: string;
    personneContact: {
      nom: string;
      prenom: string;
      fonction: string;
    };
    email: string;
    telephone: string;
    adresse: {
      rue: string;
      codePostal: string;
      ville: string;
      pays: string;
    };
    notes: string;
  };
  updateFormData: (field: string, value: string) => void;
  isEditing: boolean;
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  formData, 
  updateFormData, 
  isEditing 
}) => {
  if (!isOpen) return null;

  return (
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
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          {isEditing ? 'Modifier le client' : 'Nouveau client'}
        </h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom de société *</label>
              <input
                type="text"
                value={formData.nomSociete}
                onChange={(e) => updateFormData('nomSociete', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nom du contact *</label>
              <input
                type="text"
                value={formData.personneContact.nom}
                onChange={(e) => updateFormData('personneContact.nom', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prénom du contact *</label>
              <input
                type="text"
                value={formData.personneContact.prenom}
                onChange={(e) => updateFormData('personneContact.prenom', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fonction</label>
              <input
                type="text"
                value={formData.personneContact.fonction}
                onChange={(e) => updateFormData('personneContact.fonction', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Téléphone</label>
              <input
                type="text"
                value={formData.telephone}
                onChange={(e) => updateFormData('telephone', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rue</label>
              <input
                type="text"
                value={formData.adresse.rue}
                onChange={(e) => updateFormData('adresse.rue', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Code postal</label>
              <input
                type="text"
                value={formData.adresse.codePostal}
                onChange={(e) => updateFormData('adresse.codePostal', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ville</label>
              <input
                type="text"
                value={formData.adresse.ville}
                onChange={(e) => updateFormData('adresse.ville', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateFormData('notes', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onSubmit}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              {isEditing ? 'Mettre à jour' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    nomSociete: '',
    personneContact: {
      nom: '',
      prenom: '',
      fonction: ''
    },
    email: '',
    telephone: '',
    adresse: {
      rue: '',
      codePostal: '',
      ville: '',
      pays: 'France'
    },
    notes: ''
  });

  useEffect(() => {
    loadClients();
  }, [searchTerm]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.getClients(searchTerm, true);
      setClients(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingClient) {
        await clientService.updateClient(editingClient._id, formData);
        toast.success('Client mis à jour avec succès');
      } else {
        await clientService.createClient(formData);
        toast.success('Client créé avec succès');
      }
      resetForm();
      loadClients();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      nomSociete: client.nomSociete,
      personneContact: { 
        nom: client.personneContact.nom, 
        prenom: client.personneContact.prenom, 
        fonction: client.personneContact.fonction || '' 
      },
      email: client.email,
      telephone: client.telephone || '',
      adresse: { 
        rue: client.adresse.rue || '', 
        codePostal: client.adresse.codePostal || '', 
        ville: client.adresse.ville || '', 
        pays: client.adresse.pays 
      },
      notes: client.notes || ''
    });
    setShowEditModal(true);
  };

  const handleCreate = () => {
    setEditingClient(null);
    resetForm();
    setShowCreateModal(true);
  };

  const handleDelete = async (clientId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir désactiver ce client ?')) {
      try {
        await clientService.deleteClient(clientId);
        toast.success('Client désactivé avec succès');
        loadClients();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      nomSociete: '',
      personneContact: { nom: '', prenom: '', fonction: '' },
      email: '',
      telephone: '',
      adresse: { rue: '', codePostal: '', ville: '', pays: 'France' },
      notes: ''
    });
    setEditingClient(null);
    setShowCreateModal(false);
    setShowEditModal(false);
  };

  const updateFormData = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des Clients</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Nouveau Client
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Rechercher un client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      {/* Liste des clients */}
      {loading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <div key={client._id} className="border border-gray-300 rounded p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{client.nomSociete}</h3>
                  <p className="text-gray-600">
                    {client.personneContact.prenom} {client.personneContact.nom}
                    {client.personneContact.fonction && ` - ${client.personneContact.fonction}`}
                  </p>
                  <p className="text-gray-600">{client.email}</p>
                  {client.telephone && <p className="text-gray-600">{client.telephone}</p>}
                  {client.adresse.rue && (
                    <p className="text-gray-600">
                      {client.adresse.rue}, {client.adresse.codePostal} {client.adresse.ville}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(client)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(client._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Désactiver
                  </button>
                </div>
              </div>
            </div>
          ))}
          {clients.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Aucun client trouvé
            </div>
          )}
        </div>
      )}

      {/* Modal de création */}
      <ClientFormModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmit}
        formData={formData}
        updateFormData={updateFormData}
        isEditing={false}
      />

      {/* Modal d'édition */}
      <ClientFormModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        onSubmit={handleSubmit}
        formData={formData}
        updateFormData={updateFormData}
        isEditing={true}
      />
    </div>
  );
};

export default ClientManagement; 