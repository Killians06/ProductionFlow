import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setAuthToken } from './services/api';

// Initialiser le token d'authentification au démarrage
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
// createRoot(document.getElementById('root')!).render(
//   <App />
// );