import { useState, useEffect } from 'react';
import { Command } from '../types';
import { commandsApi } from '../services/api';
import { COMMAND_EVENTS, emitCommandEvent, useCommandEvents } from '../utils/syncEvents';

export const useCommands = (filters?: { status?: string; search?: string }) => {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommands = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await commandsApi.getAll(filters);
      const parseCommandDates = (cmd: any) => ({
        ...cmd,
        id: cmd.id || cmd._id,
        dateLivraison: cmd.dateLivraison ? new Date(cmd.dateLivraison) : undefined,
        dateCreation: cmd.dateCreation ? new Date(cmd.dateCreation) : undefined,
      });
      const parsedCommands = response.commands?.map(parseCommandDates) || [];
      setCommands(parsedCommands);
      
    } catch (err) {
      setError('Erreur lors du chargement des commandes');
      console.error('Erreur fetchCommands:', err);
    } finally {
      setLoading(false);
    }
  };

  // Écouter les événements de synchronisation avec useCommandEvents
  const handleCommandUpdate = (event: CustomEvent) => {
    console.log('useCommands - Événement UPDATE reçu:', event.detail);
    const { commandId, updates } = event.detail;
    setCommands(prev => prev.map(cmd => {
      if (cmd.id === commandId || cmd._id === commandId) {
        // Si les étapes de production sont mises à jour, les remplacer complètement
        if (updates.etapesProduction) {
          return { 
            ...cmd, 
            ...updates,
            etapesProduction: updates.etapesProduction 
          };
        }
        // Sinon, faire une mise à jour normale
        return { ...cmd, ...updates };
      }
      return cmd;
    }));
  };

  const handleCommandDelete = (event: CustomEvent) => {
    console.log('useCommands - Événement DELETE reçu:', event.detail);
    const { commandId } = event.detail;
    setCommands(prev => prev.filter(cmd => 
      cmd.id !== commandId && cmd._id !== commandId
    ));
  };

  const handleCommandCreate = (event: CustomEvent) => {
    console.log('useCommands - Événement CREATE reçu:', event.detail);
    const { command } = event.detail;
    const parseCommandDates = (cmd: any) => ({
      ...cmd,
      id: cmd.id || cmd._id,
      dateLivraison: cmd.dateLivraison ? new Date(cmd.dateLivraison) : undefined,
      dateCreation: cmd.dateCreation ? new Date(cmd.dateCreation) : undefined,
    });
    const parsedCommand = parseCommandDates(command);
    
    // Vérifier si la commande existe déjà pour éviter les doublons
    setCommands(prev => {
      const exists = prev.some(cmd => 
        cmd.id === parsedCommand.id || 
        cmd._id === parsedCommand._id || 
        cmd.numero === parsedCommand.numero
      );
      if (exists) {
        // Si elle existe, la mettre à jour au lieu de l'ajouter
        return prev.map(cmd => 
          cmd.id === parsedCommand.id || 
          cmd._id === parsedCommand._id || 
          cmd.numero === parsedCommand.numero
            ? parsedCommand
            : cmd
        );
      } else {
        // Si elle n'existe pas, l'ajouter
        return [parsedCommand, ...prev];
      }
    });
  };

  const handleStatusChange = (event: CustomEvent) => {
    console.log('useCommands - Événement STATUS_CHANGE reçu:', event.detail);
    const { commandId, newStatus, progression } = event.detail;
    setCommands(prev => prev.map(cmd => 
      cmd.id === commandId || cmd._id === commandId 
        ? { ...cmd, statut: newStatus, progression }
        : cmd
    ));
  };

  // Utiliser useCommandEvents pour chaque type d'événement
  useCommandEvents(handleCommandUpdate, 'UPDATE');
  useCommandEvents(handleCommandDelete, 'DELETE');
  useCommandEvents(handleCommandCreate, 'CREATE');
  useCommandEvents(handleStatusChange, 'STATUS_CHANGE');

  useEffect(() => {
    fetchCommands();
  }, [filters?.status, filters?.search]);

  const createCommand = async (commandData: Omit<Command, 'id' | 'numero'>) => {
    try {
      const newCommand = await commandsApi.create(commandData);
      const parseCommandDates = (cmd: any) => ({
        ...cmd,
        dateLivraison: cmd.dateLivraison ? new Date(cmd.dateLivraison) : undefined,
        dateCreation: cmd.dateCreation ? new Date(cmd.dateCreation) : undefined,
      });
      const parsedCommand = parseCommandDates(newCommand);
      
      // Vérifier si la commande existe déjà avant de l'ajouter
      setCommands(prev => {
        const exists = prev.some(cmd => 
          cmd.id === parsedCommand.id || 
          cmd._id === parsedCommand._id || 
          cmd.numero === parsedCommand.numero
        );
        if (exists) {
          // Si elle existe, la mettre à jour
          return prev.map(cmd => 
            cmd.id === parsedCommand.id || 
            cmd._id === parsedCommand._id || 
            cmd.numero === parsedCommand.numero
              ? parsedCommand
              : cmd
          );
        } else {
          // Si elle n'existe pas, l'ajouter
          return [parsedCommand, ...prev];
        }
      });
      
      // Émettre l'événement de synchronisation (partagé entre onglets)
      console.log('useCommands - Émission événement CREATE:', { command: parsedCommand });
      emitCommandEvent('CREATE', { command: parsedCommand });
      
      return parsedCommand;
    } catch (err) {
      setError('Erreur lors de la création de la commande');
      throw err;
    }
  };

  const updateCommand = async (id: string, commandData: Partial<Command>) => {
    try {
      const updatedCommand = await commandsApi.update(id, commandData);
      const parseCommandDates = (cmd: any) => ({
        ...cmd,
        id: cmd.id || cmd._id,
        dateLivraison: cmd.dateLivraison ? new Date(cmd.dateLivraison) : undefined,
        dateCreation: cmd.dateCreation ? new Date(cmd.dateCreation) : undefined,
      });
      const parsedCommand = parseCommandDates(updatedCommand);
      setCommands(prev => prev.map(cmd => cmd.id === id ? parsedCommand : cmd));
      
      // Émettre l'événement de synchronisation (partagé entre onglets)
      console.log('useCommands - Émission événement UPDATE:', { commandId: id, updates: commandData });
      emitCommandEvent('UPDATE', { commandId: id, updates: commandData });
      
      return parsedCommand;
    } catch (err) {
      setError('Erreur lors de la mise à jour de la commande');
      throw err;
    }
  };

  const updateCommandStatus = async (id: string, statut: string, progression: number, notifierClient?: boolean) => {
    try {
      const response = await commandsApi.updateStatus(id, statut, progression, notifierClient);
      const parseCommandDates = (cmd: any) => ({
        ...cmd,
        id: cmd.id || cmd._id,
        dateLivraison: cmd.dateLivraison ? new Date(cmd.dateLivraison) : undefined,
        dateCreation: cmd.dateCreation ? new Date(cmd.dateCreation) : undefined,
      });
      
      let parsedCommand: Command;
      if (response.command) {
        parsedCommand = parseCommandDates(response.command);
        setCommands(prev => prev.map(cmd => cmd.id === id ? parsedCommand : cmd));
      } else {
        parsedCommand = parseCommandDates(response);
        setCommands(prev => prev.map(cmd => cmd.id === id ? parsedCommand : cmd));
      }
      
      // Émettre l'événement de synchronisation pour le changement de statut (partagé entre onglets)
      console.log('useCommands - Émission événement STATUS_CHANGE:', { commandId: id, newStatus: statut, progression });
      emitCommandEvent('STATUS_CHANGE', { commandId: id, newStatus: statut, progression });
      
      return { command: parsedCommand, previewUrl: response.previewUrl };
    } catch (err) {
      setError('Erreur lors de la mise à jour du statut');
      throw err;
    }
  };

  const deleteCommand = async (id: string) => {
    try {
      await commandsApi.delete(id);
      setCommands(prev => prev.filter(cmd => cmd.id !== id));
      
      // Émettre l'événement de synchronisation (partagé entre onglets)
      console.log('useCommands - Émission événement DELETE:', { commandId: id });
      emitCommandEvent('DELETE', { commandId: id });
    } catch (err) {
      setError('Erreur lors de la suppression de la commande');
      throw err;
    }
  };

  return {
    commands,
    loading,
    error,
    refetch: fetchCommands,
    createCommand,
    updateCommand,
    updateCommandStatus,
    deleteCommand,
  };
};