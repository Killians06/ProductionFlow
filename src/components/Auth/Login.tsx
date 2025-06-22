import React, { useState, FormEvent, useEffect } from 'react';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface LoginProps {
  onLogin: (credentials: any) => void;
  onRegister: (userInfo: any) => void;
  invitationToken?: string | null;
  invitationEmail?: string | null;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onRegister, invitationToken, invitationEmail }) => {
  const [isLoginView, setIsLoginView] = useState(!invitationToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [nomOrganisation, setNomOrganisation] = useState('');

  useEffect(() => {
    if (invitationToken) {
      setIsLoginView(false);
      toast.info('Vous avez été invité. Veuillez compléter votre inscription.');
    }
    if (invitationEmail) {
      setEmail(invitationEmail);
    }
  }, [invitationToken, invitationEmail]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isLoginView) {
      onLogin({ email, password });
    } else {
      // Inscription
      if (!nom || !password) {
        toast.error("Veuillez remplir tous les champs.");
        return;
      }
      if (!invitationToken && !nomOrganisation) {
        toast.error("Le nom de l'organisation est requis.");
        return;
      }
      onRegister({ nom, email, password, nomOrganisation, invitationToken: invitationToken });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 space-y-6">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {isLoginView ? 'Connectez-vous à votre compte' : 'Créez un nouveau compte'}
          </h2>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {!isLoginView && (
            <>
              <div>
                <label htmlFor="nom" className="sr-only">Nom</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="nom"
                    name="nom"
                    type="text"
                    required
                    className="input pl-10 w-full"
                    placeholder="Votre nom complet"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="organisation" className="sr-only">Nom de l'organisation</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  {!invitationToken && (
                    <input
                      id="organisation"
                      name="organisation"
                      type="text"
                      required={!invitationToken}
                      className="input pl-10 w-full"
                      placeholder="Nom de votre organisation"
                      value={nomOrganisation}
                      onChange={(e) => setNomOrganisation(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </>
          )}
          <div>
            <label htmlFor="email-address" className="sr-only">Adresse email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input pl-10 w-full"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!!invitationEmail}
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input pl-10 w-full"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button type="submit" className="btn btn-primary w-full flex justify-center">
              {isLoginView ? 'Se connecter' : 'S\'inscrire'}
            </button>
          </div>
        </form>
        <div className="text-center text-sm">
          <button
            onClick={() => setIsLoginView(!isLoginView)}
            className="font-medium text-blue-600 hover:text-blue-500"
            disabled={!!invitationToken}
          >
            {isLoginView ? 'Pas de compte ? Créez-en un' : 'Vous avez déjà un compte ? Connectez-vous'}
          </button>
        </div>
      </div>
    </div>
  );
}; 