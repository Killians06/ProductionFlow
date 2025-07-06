import { useEffect, useRef } from 'react';
import { getSocketInstance } from '../config/socket';
import { useCommandsContext } from '../components/Commands/CommandsContext';
import { Command } from '../types';

export const useSocketSync = () => {
  const { commands, syncCommandCreate, syncCommandUpdate, syncCommandDelete } = useCommandsContext();

  useEffect(() => {
    // Utiliser le singleton Socket.IO
    const socket = getSocketInstance();

    // Événement de connexion
    socket.on('connect', () => {
      console.log('🔌 Connecté au serveur Socket.IO');
    });

    // Événement de déconnexion
    socket.on('disconnect', () => {
      console.log('🔌 Déconnecté du serveur Socket.IO');
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

    socket.on('STEP_UPDATED', (data: { commandId: string; stepId: string; updates: any }) => {
      console.log('📡 STEP_UPDATED:', data.commandId, data.stepId);
      // TODO: Implémenter la logique de mise à jour des étapes
    });

    socket.on('COMMAND_FULLY_UPDATED', (data: { command: Command }) => {
      console.log('📡 COMMAND_FULLY_UPDATED:', data.command.numero, `${data.command.progression}%`);
      const { command } = data;
      const commandId = command._id || command.id;
      if (commandId) {
        syncCommandUpdate(commandId, command);
      }
    });

    // Nettoyage lors du démontage
    return () => {
      // Ne pas déconnecter le singleton ici !
      // Retirer les listeners pour éviter les doublons
      socket.off('connect');
      socket.off('disconnect');
      socket.off('COMMAND_CREATED');
      socket.off('COMMAND_UPDATED');
      socket.off('COMMAND_DELETED');
      socket.off('STATUS_CHANGED');
      socket.off('STEP_UPDATED');
      socket.off('COMMAND_FULLY_UPDATED');
    };
  }, [syncCommandCreate, syncCommandUpdate, syncCommandDelete]);

  return null;
}; 