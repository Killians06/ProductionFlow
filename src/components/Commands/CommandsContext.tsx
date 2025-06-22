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
  
  // Mettre à jour la référence et le state local quand les commandes changent
  useEffect(() => {
    commandsRef.current = ctx.commands;
    setLocalCommands(ctx.commands);
  }, [ctx.commands]);

  // Fonction pour synchroniser les mises à jour
  const syncCommandUpdate = (commandId: string, updates: Partial<Command>) => {
    console.log('🔄 syncCommandUpdate appelé avec:', { commandId, updates });
    console.log('🔄 Progression dans les updates:', updates.progression);
    
    const updatedCommands = localCommands.map(cmd => 
      cmd.id === commandId || cmd._id === commandId 
        ? { ...cmd, ...updates }
        : cmd
    );
    
    // Mettre à jour la référence et le state local
    commandsRef.current = updatedCommands;
    setLocalCommands(updatedCommands);
    
    console.log('🔄 State local mis à jour avec progression:', updatedCommands.find(cmd => cmd.id === commandId || cmd._id === commandId)?.progression);
    
    // Émettre l'événement pour notifier les autres composants
    emitCommandEvent('UPDATE', { commandId, updates, commands: updatedCommands });
  };

  // Fonction pour synchroniser les suppressions
  const syncCommandDelete = (commandId: string) => {
    const updatedCommands = localCommands.filter(cmd => 
      cmd.id !== commandId && cmd._id !== commandId
    );
    
    commandsRef.current = updatedCommands;
    setLocalCommands(updatedCommands);
    
    emitCommandEvent('DELETE', { commandId, commands: updatedCommands });
  };

  // Fonction pour synchroniser les créations
  const syncCommandCreate = (command: Command) => {
    const updatedCommands = [command, ...localCommands];
    commandsRef.current = updatedCommands;
    setLocalCommands(updatedCommands);
    
    emitCommandEvent('CREATE', { command, commands: updatedCommands });
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