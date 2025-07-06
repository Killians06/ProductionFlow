import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useCommands } from '../../hooks/useCommands';
import { Command, CommandStatus } from '../../types';
import { useSocketSync } from '../../hooks/useSocketSync';

interface CommandsContextProps {
  commands: Command[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date;
  refetch: () => void;
  forceRefresh: () => void;
  createCommand: ReturnType<typeof useCommands>['createCommand'];
  updateCommand: ReturnType<typeof useCommands>['updateCommand'];
  updateCommandStatus: ReturnType<typeof useCommands>['updateCommandStatus'];
  deleteCommand: ReturnType<typeof useCommands>['deleteCommand'];
  // Nouvelles fonctions pour la synchronisation
  syncCommandUpdate: (commandId: string, updates: Partial<Command>) => void;
  syncCommandDelete: (commandId: string) => void;
  syncCommandCreate: (command: Command) => void;
}

const CommandsContext = createContext<CommandsContextProps | undefined>(undefined);

// Événements personnalisés pour la synchronisation
const COMMAND_EVENTS = {
  UPDATE: 'command-update',
  DELETE: 'command-delete',
  CREATE: 'command-create',
  STATUS_CHANGE: 'command-status-change',
} as const;

// Fonction utilitaire pour émettre des événements
const emitCommandEvent = (eventType: keyof typeof COMMAND_EVENTS, data: any) => {
  const event = new CustomEvent(COMMAND_EVENTS[eventType], { detail: data });
  window.dispatchEvent(event);
};

// Fonction utilitaire pour écouter les événements
const useCommandEvents = (callback: (event: CustomEvent) => void, eventType: keyof typeof COMMAND_EVENTS) => {
  useEffect(() => {
    const handleEvent = (event: CustomEvent) => callback(event);
    window.addEventListener(COMMAND_EVENTS[eventType], handleEvent as EventListener);
    return () => window.removeEventListener(COMMAND_EVENTS[eventType], handleEvent as EventListener);
  }, [callback, eventType]);
};

export const useCommandsContext = () => {
  const ctx = useContext(CommandsContext);
  if (!ctx) throw new Error('useCommandsContext doit être utilisé dans CommandsProvider');
  return ctx;
};

export const CommandsProvider: React.FC<{ filters?: { status?: string; search?: string }, children: React.ReactNode }> = ({ filters, children }) => {
  const ctx = useCommands(filters);
  const commandsRef = useRef<Command[]>([]);
  const [localCommands, setLocalCommands] = React.useState<Command[]>([]);
  // Nouvelle file d'attente d'updates à appliquer
  const [pendingUpdates, setPendingUpdates] = React.useState<Array<{ commandId: string, updates: Partial<Command> }>>([]);
  // Nouvelle file d'attente d'événements à émettre
  const [pendingEvents, setPendingEvents] = React.useState<Array<{ commandId: string, updates: Partial<Command>, commands: Command[] }>>([]);

  // Mettre à jour la référence et le state local quand les commandes changent
  useEffect(() => {
    commandsRef.current = ctx.commands;
    setLocalCommands(ctx.commands);
  }, [ctx.commands]);

  // Appliquer les updates en attente dans un effet dédié
  useEffect(() => {
    if (pendingUpdates.length === 0) return;
    setLocalCommands(prevCommands => {
      let updatedCommands = [...prevCommands];
      let eventsToEmit: Array<{ commandId: string, updates: Partial<Command>, commands: Command[] }> = [];
      pendingUpdates.forEach(({ commandId, updates }) => {
        const isFullUpdate = updates && updates._id && updates.numero && updates.etapesProduction;
        updatedCommands = updatedCommands.map(cmd => {
          if (cmd.id === commandId || cmd._id === commandId) {
            if (isFullUpdate) {
              return { ...(updates as Command) };
            } else {
              return { ...cmd, ...updates };
            }
          }
          return cmd;
        });
        commandsRef.current = updatedCommands;
        eventsToEmit.push({ commandId, updates, commands: updatedCommands });
      });
      // Stocker les événements à émettre après le render
      setPendingEvents(prev => [...prev, ...eventsToEmit]);
      return updatedCommands;
    });
    setPendingUpdates([]);
  }, [pendingUpdates]);

  // Émettre les événements après le render
  useEffect(() => {
    if (pendingEvents.length === 0) return;
    pendingEvents.forEach(({ commandId, updates, commands }) => {
      emitCommandEvent('UPDATE', { commandId, updates, commands });
    });
    setPendingEvents([]);
  }, [pendingEvents]);

  // Fonction pour synchroniser les mises à jour (ajoute à la file d'attente)
  const syncCommandUpdate = (commandId: string, updates: Partial<Command>) => {
    setPendingUpdates(prev => [...prev, { commandId, updates }]);
  };

  // Fonction pour synchroniser les suppressions
  const syncCommandDelete = (commandId: string) => {
    setLocalCommands(prevCommands => {
      const updatedCommands = prevCommands.filter(cmd => 
        cmd.id !== commandId && cmd._id !== commandId
      );
      
      commandsRef.current = updatedCommands;
      emitCommandEvent('DELETE', { commandId, commands: updatedCommands });
      
      return updatedCommands;
    });
  };

  // Fonction pour synchroniser les créations
  const syncCommandCreate = (command: Command) => {
    setLocalCommands(prevCommands => {
      const updatedCommands = [command, ...prevCommands];
      commandsRef.current = updatedCommands;
      emitCommandEvent('CREATE', { command, commands: updatedCommands });
      
      return updatedCommands;
    });
  };

  // Écouter les événements de synchronisation
  useCommandEvents((event) => {
    // Les événements sont émis pour notifier les autres composants
    // L'état sera mis à jour via le contexte existant
  }, 'UPDATE');

  const enhancedContext = {
    ...ctx,
    commands: localCommands,
    lastUpdate: new Date(),
    forceRefresh: ctx.refetch,
    syncCommandUpdate,
    syncCommandDelete,
    syncCommandCreate,
  };

  return (
    <CommandsContext.Provider value={enhancedContext}>
      {children}
    </CommandsContext.Provider>
  );
}; 