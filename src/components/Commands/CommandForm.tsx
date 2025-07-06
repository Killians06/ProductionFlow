import React, { useState, useEffect } from 'react';
import { Command, ProductionStep, User, Client } from '../../types';
import { usersApi } from '../../services/api';
import ClientSelector from '../ClientSelector';

interface CommandFormProps {
  onSubmit: (data: Omit<Command, 'id' | 'numero' | 'dateCreation' | 'progression'>) => void;
  onCancel: () => void;
  initialValues?: Partial<Command>;
}

const emptyStep: Omit<ProductionStep, '_id'> = {
  nom: '',
  statut: 'pending',
  responsable: undefined,
};

export const CommandForm: React.FC<CommandFormProps> = ({ onSubmit, onCancel, initialValues }) => {
  const [clientId, setClientId] = useState<string>(initialValues?.clientId?._id || '');
  const [selectedClient, setSelectedClient] = useState<Client | null>(initialValues?.clientId || null);
  const [client, setClient] = useState(initialValues?.client || { nom: '', email: '' });
  const [produits, setProduits] = useState(initialValues?.produits?.length ? initialValues.produits : [ { nom: '', quantite: 1, specifications: '' } ]);
  const [dateLivraison, setDateLivraison] = useState(initialValues?.dateLivraison ? new Date(initialValues.dateLivraison).toISOString().slice(0,10) : '');
  const [notes, setNotes] = useState((initialValues as any)?.notes || '');
  const [etapes, setEtapes] = useState<ProductionStep[]>((initialValues as any)?.etapesProduction || []);
  const [showEtapes, setShowEtapes] = useState(!!(initialValues as any)?.etapesProduction?.length);
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userList = await usersApi.getAll();
        setUsers(userList);
      } catch (error) {
        console.error("Impossible de charger les utilisateurs", error);
      }
    };
    fetchUsers();
  }, []);

  // Mettre à jour les données client quand un client est sélectionné
  useEffect(() => {
    if (selectedClient) {
      setClient({
        nom: selectedClient.nomSociete,
        email: selectedClient.email
      });
    }
  }, [selectedClient]);

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
  };

  const handleProductChange = (idx: number, field: string, value: any) => {
    setProduits(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const addProduct = () => setProduits(prev => [ ...prev, { nom: '', quantite: 1, specifications: '' } ]);
  const removeProduct = (idx: number) => setProduits(prev => prev.filter((_, i) => i !== idx));

  const handleStepChange = (idx: number, field: string, value: any) => {
    setEtapes(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      if (field === 'responsable') {
        const selectedUser = users.find(u => u._id === value);
        return { ...s, responsable: selectedUser || undefined };
      }
      return { ...s, [field]: value };
    }));
  };
  const addStep = () => setEtapes(prev => [ ...prev, { ...emptyStep, _id: `new_${Date.now()}` } as ProductionStep ]);
  const removeStep = (idx: number) => setEtapes(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation des champs obligatoires
    if (!dateLivraison) {
      alert('Veuillez sélectionner une date de livraison.');
      return;
    }

    if (!clientId && (!client.nom || !client.email)) {
      alert('Veuillez sélectionner un client ou saisir les informations client.');
      return;
    }

    if (produits.length === 0) {
      alert('Veuillez ajouter au moins un produit.');
      return;
    }

    if (produits.some(p => !p.nom || !p.quantite)) {
      alert('Veuillez remplir tous les champs obligatoires pour les produits.');
      return;
    }

    setIsSubmitting(true);

    try {
    // Filtrer les étapes vides et valider les étapes restantes
    const validEtapes = etapes
      .filter(etape => etape.nom && etape.nom.trim() !== '') // Supprimer les étapes sans nom
      .map(s => {
        const { ...stepData } = s;
        if (s._id && s._id.startsWith('new_')) {
          (stepData as any)._id = undefined;
        }
        return {
          ...stepData,
          nom: s.nom.trim(), // Nettoyer les espaces
          responsable: s.responsable?._id as any,
        };
      });

      const commandData = {
      client,
      clientId: clientId || undefined,
      produits: produits.map(p => ({ ...p, quantite: Number(p.quantite) })),
      dateLivraison: new Date(dateLivraison),
      statut: initialValues?.statut || 'draft',
        priority: (initialValues as any)?.priority || 'medium',
      notes,
      etapesProduction: validEtapes,
              };
  
        console.log('📝 Création commande: Nouvelle commande');
        await onSubmit(commandData as any);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      alert('Erreur lors de la création de la commande. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <ClientSelector
            value={clientId}
            onChange={setClientId}
            onClientSelect={handleClientSelect}
          />
        </div>
        
        {/* Affichage des informations du client sélectionné */}
        {selectedClient && (
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Informations du client sélectionné</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Société:</span>
                <div className="text-gray-900">{selectedClient.nomSociete}</div>
              </div>
              {selectedClient.personneContact && (
                <div>
                  <span className="font-medium text-gray-600">Contact:</span>
                  <div className="text-gray-900">
                    {selectedClient.personneContact.prenom} {selectedClient.personneContact.nom}
                  </div>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-600">Email:</span>
                <div className="text-gray-900">{selectedClient.email}</div>
              </div>
              {selectedClient.telephone && (
                <div>
                  <span className="font-medium text-gray-600">Téléphone:</span>
                  <div className="text-gray-900">{selectedClient.telephone}</div>
                </div>
              )}
              {selectedClient.adresse && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-600">Adresse:</span>
                  <div className="text-gray-900">
                    {typeof selectedClient.adresse === 'string' ? selectedClient.adresse : (
                      <>
                        {(selectedClient.adresse as any).rue && <div>{(selectedClient.adresse as any).rue}</div>}
                        {((selectedClient.adresse as any).codePostal || (selectedClient.adresse as any).ville) && (
                          <div>{(selectedClient.adresse as any).codePostal} {(selectedClient.adresse as any).ville}</div>
                        )}
                        {(selectedClient.adresse as any).pays && <div>{(selectedClient.adresse as any).pays}</div>}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1">Date de livraison *</label>
          <input 
            type="date" 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            value={dateLivraison} 
            onChange={e => setDateLivraison(e.target.value)} 
            required 
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea 
          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          rows={2} 
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">Produits *</label>
        <div className="space-y-3">
        {produits.map((p, idx) => (
            <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nom du produit</label>
                  <input 
                    type="text" 
                    placeholder="Nom" 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    value={p.nom} 
                    onChange={e => handleProductChange(idx, 'nom', e.target.value)} 
                    required 
                  />
                </div>
                <div className="md:col-span-7">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Détails</label>
                  <textarea 
                    placeholder="Spécifications..." 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y" 
                    value={p.specifications} 
                    onChange={e => handleProductChange(idx, 'specifications', e.target.value)} 
                    rows={2}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantité</label>
                  <input 
                    type="number" 
                    min={1} 
                    placeholder="Qté" 
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    value={p.quantite} 
                    onChange={e => handleProductChange(idx, 'quantite', e.target.value)} 
                    required 
                  />
                </div>
                {produits.length > 1 && (
                  <div className="md:col-span-1 flex justify-end">
                    <button 
                      type="button" 
                      className="text-red-500 hover:text-red-700 text-sm mt-6" 
                      onClick={() => removeProduct(idx)}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
          </div>
        ))}
        </div>
        <button 
          type="button" 
          className="text-blue-600 hover:text-blue-800 mt-3" 
          onClick={addProduct}
        >
          + Ajouter un produit
        </button>
      </div>
      
      <div>
        <button 
          type="button" 
          className="text-blue-600 hover:text-blue-800" 
          onClick={() => setShowEtapes(v => !v)}
        >
          {showEtapes ? 'Masquer les étapes de production' : 'Ajouter des étapes de production'} (optionnel)
        </button>
        {showEtapes && (
          <div className="mt-2 space-y-2">
            {etapes.map((s, idx) => (
              <div key={s._id || `new-${idx}`} className="grid grid-cols-3 gap-2 items-center">
                <input 
                  type="text" 
                  placeholder="Nom de l'étape" 
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={s.nom} 
                  onChange={e => handleStepChange(idx, 'nom', e.target.value)} 
                />
                <select 
                  className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  value={s.responsable?._id || ''} 
                  onChange={e => handleStepChange(idx, 'responsable', e.target.value)}
                >
                  <option value="">-- Responsable --</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.nom}</option>
                  ))}
                </select>
                <button 
                  type="button" 
                  className="text-red-500 hover:text-red-700 text-sm" 
                  onClick={() => removeStep(idx)}
                >
                  Supprimer
                </button>
              </div>
            ))}
            <button 
              type="button" 
              className="text-blue-600 hover:text-blue-800 mt-1" 
              onClick={addStep}
            >
              + Ajouter une étape
            </button>
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
        <button 
          type="button" 
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </button>
        <button 
          type="submit" 
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Création...' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  );
}; 