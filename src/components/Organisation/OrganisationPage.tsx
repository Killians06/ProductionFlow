import React, { useState, useEffect } from 'react';
import { inviteUser } from '../../services/authApi';
import api, { setAuthToken } from '../../services/api';
import { toast } from 'react-toastify';
import { Loader2, Send, Briefcase, User as UserIcon } from 'lucide-react';
import { User } from '../../types';

interface OrganisationData {
  nom: string;
  membres: User[];
}

const OrganisationPage = () => {
  const [organisation, setOrganisation] = useState<OrganisationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(true);

  useEffect(() => {
    const fetchOrganisation = async () => {
      // S'assurer que le token est bien dans l'en-tête
      const token = localStorage.getItem('token');
      if (token) {
        setAuthToken(token);
      }

      try {
        const { data } = await api.get('/organisation');
        setOrganisation(data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Impossible de charger les informations de l\'organisation.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganisation();
  }, []);

  // Extraction de fetchInvitations pour pouvoir l'appeler après suppression
  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const token = localStorage.getItem('token');
      if (token) setAuthToken(token);
      const { data } = await api.get('/invitations/pending');
      setPendingInvitations(data.invitations || []);
    } catch (err: any) {
      // Optionnel : afficher une erreur
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, [inviteLoading]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error('Veuillez entrer une adresse e-mail.');
      return;
    }
    setInviteLoading(true);
    try {
      const response = await inviteUser(inviteEmail);
      toast.success(response.message || 'Invitation envoyée.');
      setInviteEmail('');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Une erreur est survenue.';
      toast.error(errorMessage);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (token) setAuthToken(token);
      await api.delete(`/invitations/${invitationId}`);
      toast.success('Invitation supprimée.');
      fetchInvitations(); // refresh immédiat
    } catch (error: any) {
      toast.error('Erreur lors de la suppression de l\'invitation.');
    }
  };

  if (loading) return <div><Loader2 className="animate-spin mr-2" /> Chargement de votre organisation...</div>;
  if (error) return <div className="text-red-500 bg-red-50 p-4 rounded-md">{error}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Briefcase className="w-8 h-8 mr-3 text-blue-600" />
          {organisation?.nom}
        </h1>
        <p className="mt-2 text-md text-gray-600">
          Gérez les membres de votre organisation et envoyez des invitations.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">Inviter un nouveau membre</h3>
          <form onSubmit={handleInvite} className="mt-4 flex items-center space-x-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="adresse@email.com"
              className="input flex-grow"
              required
              disabled={inviteLoading}
            />
            <button type="submit" className="btn btn-primary flex items-center" disabled={inviteLoading}>
              {inviteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  <span>Envoi...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  <span>Inviter</span>
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Membres ({organisation?.membres.length})</h3>
          <div className="overflow-x-auto mb-8">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organisation?.membres.map((membre) => (
                  <tr key={membre._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{membre.nom}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{membre.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{membre.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">Invitations en attente</h3>
          {loadingInvitations ? (
            <div className="flex items-center text-gray-500"><Loader2 className="animate-spin mr-2" /> Chargement des invitations...</div>
          ) : pendingInvitations.length === 0 ? (
            <div className="text-gray-500">Aucune invitation en attente.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Envoyée le</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expire le</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingInvitations.map((inv) => (
                  <tr key={inv._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{inv.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(inv.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(inv.expires).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleCancelInvitation(inv._id)}
                      >
                        Annuler
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganisationPage; 