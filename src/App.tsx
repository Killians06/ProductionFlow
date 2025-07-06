import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Dashboard } from './components/Dashboard/Dashboard';
import { CommandsList } from './components/Commands/CommandsList';
import { Planning } from './components/Planning/Planning';
import { ClientSpace } from './components/Client/ClientSpace';
import ClientManagement from './components/ClientManagement';
import OrganisationPage from './components/Organisation/OrganisationPage';
import QuickStatusUpdate from './components/Commands/QuickStatusUpdate';
import { Login } from './components/Auth/Login';
import { loginUser, registerUser, getInvitationDetails } from './services/authApi';
import { setAuthToken } from './services/api';
import { User } from './types';
import { NotificationProvider } from './context/NotificationContext';
import { MainLayout } from './components/Layout/MainLayout';
import { MyAccount } from './components/Account/MyAccount';
import { SocketSyncProvider } from './components/Commands/SocketSyncProvider';
import { CommandsProvider } from './components/Commands/CommandsContext';

const AppContent = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      setInvitationToken(tokenFromUrl);
      
      const fetchInvitationDetails = async () => {
        try {
          const { data } = await getInvitationDetails(tokenFromUrl);
          setInvitationEmail(data.email);
        } catch (error) {
          console.error("Impossible de récupérer les détails de l'invitation:", error);
          setInvitationToken(null);
          window.history.pushState({}, document.title, "/");
        }
      };
      fetchInvitationDetails();
    }

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setAuthToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (credentials: any) => {
    console.log("Tentative de connexion avec:", credentials);
    try {
      const { data } = await loginUser(credentials);
      console.log("Connexion réussie, réponse API:", data);
      setToken(data.token);
      setUser(data.user);
      setAuthToken(data.token);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setInvitationToken(null);
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Erreur détaillée de connexion:", error.response?.data || error.message);
    }
  };

  const handleRegister = async (userInfo: any) => {
    console.log("Tentative d'inscription avec:", userInfo);
    try {
      const { data: registerData } = await registerUser(userInfo);
      console.log("Inscription réussie, réponse API:", registerData);
      await handleLogin({ email: userInfo.email, password: userInfo.password });
    } catch (error: any) {
      console.error("Erreur détaillée d'inscription:", error.response?.data || error.message);
    }
  };
  
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

    return (
    <NotificationProvider>
      <CommandsProvider>
        <SocketSyncProvider>
        <Routes>
          <Route path="/quick-status/:commandId" element={<QuickStatusUpdate />} />
            <Route path="/login" element={<Login onLogin={handleLogin} onRegister={handleRegister} invitationToken={invitationToken} invitationEmail={invitationEmail} />} />
            {token ? (
              <Route path="/" element={<MainLayout user={user} onLogout={handleLogout} />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="commands" element={<CommandsList />} />
                <Route path="planning" element={<Planning />} />
                <Route path="client" element={<ClientSpace />} />
                <Route path="clients" element={<ClientManagement />} />
                <Route path="organisation" element={<OrganisationPage />} />
                <Route path="mon-compte" element={<MyAccount />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            ) : (
              <Route path="*" element={<Navigate to="/login" replace />} />
            )}
        </Routes>
        </SocketSyncProvider>
      </CommandsProvider>
    </NotificationProvider>
    );
  }

function App() {
  return (
    <Router>
      <Routes>
        {/* Route mobile SANS providers */}
        <Route path="/quick-status/:commandId" element={<QuickStatusUpdate />} />

        {/* Toutes les autres routes AVEC providers */}
        <Route
          path="*"
          element={
            <NotificationProvider>
              <CommandsProvider>
                <SocketSyncProvider>
                  <AppContent />
                </SocketSyncProvider>
              </CommandsProvider>
            </NotificationProvider>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;