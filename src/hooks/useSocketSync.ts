import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useCommandsContext } from '../components/Commands/CommandsContext';
import { Command } from '../types';
import { SOCKET_CONFIG } from '../config/socket';

export const useSocketSync = () => {
  const socketRef = useRef<Socket | null>(null);
  const { commands, syncCommandCreate, syncCommandUpdate, syncCommandDelete } = useCommandsContext();

  useEffect(() => {
    // Initialiser la connexion Socket.IO
    socketRef.current = io(SOCKET_CONFIG.SERVER_URL, SOCKET_CONFIG.CONNECTION_OPTIONS);

    const socket = socketRef.current;

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
      console.log('📡 Événement COMMAND_CREATED reçu:', data);
      const { command } = data;
      
      // Utiliser la fonction de synchronisation du contexte
      syncCommandCreate(command);
    });

    socket.on('COMMAND_UPDATED', (data: { commandId: string; updates: Partial<Command> }) => {
      console.log('📡 Événement COMMAND_UPDATED reçu:', data);
      const { commandId, updates } = data;
      
      // Utiliser la fonction de synchronisation du contexte
      syncCommandUpdate(commandId, updates);
    });

    socket.on('COMMAND_DELETED', (data: { commandId: string }) => {
      console.log('📡 Événement COMMAND_DELETED reçu:', data);
      const { commandId } = data;
      
      // Utiliser la fonction de synchronisation du contexte
      syncCommandDelete(commandId);
    });

    socket.on('STATUS_CHANGED', (data: { commandId: string; newStatus: string; progression: number }) => {
      console.log('📡 Événement STATUS_CHANGED reçu:', data);
      const { commandId, newStatus, progression } = data;
      
      // Utiliser la fonction de synchronisation du contexte
      syncCommandUpdate(commandId, { statut: newStatus as any, progression });
    });

    socket.on('STEP_UPDATED', (data: { commandId: string; stepId: string; updates: any }) => {
      console.log('📡 Événement STEP_UPDATED reçu:', data);
      const { commandId, stepId, updates } = data;
      
      // Pour les mises à jour d'étapes, on doit mettre à jour la commande complète
      const currentCommand = commands.find(cmd => cmd._id === commandId || cmd.id === commandId);
      if (currentCommand) {
        // Si on a les étapes complètes dans les updates, les utiliser
        if (updates.etapesProduction) {
          // Calculer la nouvelle progression basée sur les étapes mises à jour
          const completedSteps = updates.etapesProduction.filter((e: any) => e.statut === 'completed').length;
          const newProgression = Math.round((completedSteps / updates.etapesProduction.length) * 100);
          
          syncCommandUpdate(commandId, {
            etapesProduction: updates.etapesProduction,
            progression: newProgression
          });
          console.log('📡 Progression calculée et mise à jour:', newProgression);
        } else {
          // Sinon, mettre à jour seulement l'étape spécifique
          const updatedEtapes = currentCommand.etapesProduction?.map(etape => 
            etape._id === stepId 
              ? { ...etape, ...updates }
              : etape
          ) || [];
          
          // Calculer la nouvelle progression
          const completedSteps = updatedEtapes.filter(e => e.statut === 'completed').length;
          const newProgression = Math.round((completedSteps / updatedEtapes.length) * 100);
          
          syncCommandUpdate(commandId, {
            etapesProduction: updatedEtapes,
            progression: newProgression
          });
          console.log('📡 Progression calculée et mise à jour:', newProgression);
        }
      }
    });

    socket.on('COMMAND_FULLY_UPDATED', (data: { command: Command }) => {
      console.log('📡 Événement COMMAND_FULLY_UPDATED reçu:', data);
      console.log('📡 Progression reçue:', data.command.progression);
      console.log('📡 Étapes reçues:', data.command.etapesProduction?.length);
      const { command } = data;
      
      const commandId = command._id || command.id;
      if (commandId) {
        // Mettre à jour la commande complète avec toutes ses propriétés
        syncCommandUpdate(commandId, {
          ...command,
          progression: command.progression,
          etapesProduction: command.etapesProduction,
          statut: command.statut
        });
        console.log('📡 Commande mise à jour via syncCommandUpdate avec progression:', command.progression);
      }
    });

    // Nettoyage lors du démontage
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [syncCommandCreate, syncCommandUpdate, syncCommandDelete, commands]);

  return socketRef.current;
}; 