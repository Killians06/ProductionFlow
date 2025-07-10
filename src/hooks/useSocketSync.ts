import { useEffect, useRef } from 'react';
import { getSocketInstance, reauthenticateSocket } from '../config/socket';
import { useCommandsContext } from '../components/Commands/CommandsContext';
import { Command } from '../types';

export const useSocketSync = () => {
  const { commands, syncCommandCreate, syncCommandUpdate, syncCommandDelete } = useCommandsContext();
  const isAuthenticated = useRef(false);

  useEffect(() => {
    // Utiliser le singleton Socket.IO
    const socket = getSocketInstance();

    // Événement de connexion
    socket.on('connect', () => {
      console.log('🔌 Connecté au serveur Socket.IO');
      isAuthenticated.current = false;
    });

    // Événement de déconnexion
    socket.on('disconnect', () => {
      console.log('🔌 Déconnecté du serveur Socket.IO');
      isAuthenticated.current = false;
    });

    // Événement d'authentification réussie
    socket.on('authenticated', (data) => {
      console.log('✅ [AUTH] Socket authentifié:', {
        organisation: data.organisation,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
      isAuthenticated.current = true;
    });

    // Événement d'erreur d'authentification
    socket.on('auth_error', (error) => {
      console.error('❌ Erreur d\'authentification socket:', error.message);
      isAuthenticated.current = false;
      
      // Si le token a expiré, rediriger vers la page de login
      if (error.message && error.message.includes('expired')) {
        console.log('🔄 Token expiré, redirection vers la page de login...');
        // Rediriger vers la page de login
        window.location.href = '/login';
      }
    });

    // Écouter les événements de synchronisation des commandes
    socket.on('COMMAND_CREATED', (data: { command: Command }) => {
      console.log('📡 COMMAND_CREATED:', data.command.numero);
      const { command } = data;
      syncCommandCreate(command);
    });

    socket.on('COMMAND_UPDATED', (data: { commandId: string; updates: Partial<Command> }) => {
      console.log('📡 COMMAND_UPDATED:', data.commandId, data.updates.statut || data.updates.progression);
      const { commandId, updates } = data;
      syncCommandUpdate(commandId, updates);
    });

    socket.on('COMMAND_DELETED', (data: { commandId: string }) => {
      console.log('📡 COMMAND_DELETED:', data.commandId);
      const { commandId } = data;
      syncCommandDelete(commandId);
    });

    socket.on('STATUS_CHANGED', (data: { commandId: string; newStatus: string; progression: number }) => {
      console.log('📡 STATUS_CHANGED:', data.commandId, '→', data.newStatus, `${data.progression}%`);
      const { commandId, newStatus, progression } = data;
      syncCommandUpdate(commandId, { statut: newStatus as any, progression });
    });

    socket.on('STEP_UPDATED', (data: { commandId: string; stepId: string; updates: any; command?: Command }) => {
      console.log('📡 [STEP_UPDATED] Événement reçu:', {
        commandId: data.commandId,
        stepId: data.stepId,
        hasCommand: !!data.command,
        hasUpdates: !!data.updates,
        timestamp: new Date().toISOString(),
        socketId: socket.id,
        authenticated: isAuthenticated.current
      });
      
      // Si la commande complète est présente dans l'événement, on met à jour toute la commande
      if (data.command && (data.command._id || data.command.id)) {
        const commandId = data.command._id || data.command.id;
        if (commandId) {
          console.log('🔄 [STEP_UPDATED] Mise à jour de la commande complète:', commandId, 'progression:', data.command.progression);
          syncCommandUpdate(commandId, data.command);
        }
      } else if (data.commandId) {
        // Sinon, on met à jour juste l'étape/les updates
        console.log('🔄 [STEP_UPDATED] Mise à jour partielle:', data.commandId, 'updates:', data.updates);
        syncCommandUpdate(data.commandId, data.updates);
      }
    });

    socket.on('COMMAND_FULLY_UPDATED', (data: { command: Command }) => {
      console.log('📡 [COMMAND_FULLY_UPDATED] Événement reçu:', {
        commandId: data.command._id || data.command.id,
        numero: data.command.numero,
        progression: data.command.progression,
        etapesCount: data.command.etapesProduction?.length || 0,
        timestamp: new Date().toISOString(),
        socketId: socket.id,
        authenticated: isAuthenticated.current
      });
      
      const { command } = data;
      const commandId = command._id || command.id;
      if (commandId) {
        console.log('🔄 [COMMAND_FULLY_UPDATED] Mise à jour complète de la commande:', commandId);
        syncCommandUpdate(commandId, command);
      }
    });

    // Écouter le diagnostic des rooms
    socket.on('rooms_diagnosis', (roomInfo: any) => {
      console.log('🔍 [DIAGNOSE] État des rooms reçu:', roomInfo);
    });

    // Vérifier l'authentification après un délai et forcer si nécessaire
    const checkAuthTimeout = setTimeout(() => {
      if (!isAuthenticated.current && socket.connected) {
        console.log('🔄 Vérification d\'authentification - forcing reauth...');
        reauthenticateSocket();
      }
    }, 2000);

    // Nettoyage lors du démontage
    return () => {
      clearTimeout(checkAuthTimeout);
      // Ne pas déconnecter le singleton ici !
      // Retirer les listeners pour éviter les doublons
      socket.off('connect');
      socket.off('disconnect');
      socket.off('authenticated');
      socket.off('auth_error');
      socket.off('COMMAND_CREATED');
      socket.off('COMMAND_UPDATED');
      socket.off('COMMAND_DELETED');
      socket.off('STATUS_CHANGED');
      socket.off('STEP_UPDATED');
      socket.off('COMMAND_FULLY_UPDATED');
      socket.off('rooms_diagnosis');
    };
  }, [syncCommandCreate, syncCommandUpdate, syncCommandDelete]);

  return null;
}; 