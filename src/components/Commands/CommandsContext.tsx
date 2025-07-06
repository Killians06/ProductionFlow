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
  const updateTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Mettre à jour la référence et le state local quand les commandes changent
  useEffect(() => {
    commandsRef.current = ctx.commands;
    setLocalCommands(ctx.commands);
  }, [ctx.commands]);

  // Nettoyage des timeouts lors du démontage
  useEffect(() => {
    return () => {
      updateTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      updateTimeoutsRef.current.clear();
    };
  }, []);

  // Fonction pour synchroniser les mises à jour avec debounce
  const syncCommandUpdate = (commandId: string, updates: Partial<Command>) => {
    console.log('🔄 syncCommandUpdate appelé avec:', { commandId, updates });
    console.log('🔄 Progression dans les updates:', updates.progression);
    
    // Validation de la progression
    if (updates.progression !== undefined) {
      if (updates.progression < 0 || updates.progression > 100) {
        console.warn('⚠️ Progression invalide détectée:', updates.progression, 'pour la commande:', commandId);
        // Corriger la progression si elle est invalide
        if (updates.progression < 0) updates.progression = 0;
        if (updates.progression > 100) updates.progression = 100;
      }
    }
    
    // Annuler la mise à jour précédente si elle existe
    const existingTimeout = updateTimeoutsRef.current.get(commandId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Créer une nouvelle mise à jour avec debounce
    const timeoutId = setTimeout(() => {
      // Si l'update reçue est une commande complète (cas de COMMAND_FULLY_UPDATED), on remplace tout l'objet
      const isFullUpdate = updates && updates._id && updates.numero && updates.etapesProduction;
      
      // Utiliser une fonction de mise à jour pour éviter les conflits de state
      setLocalCommands(prevCommands => {
        const updatedCommands = prevCommands.map(cmd => {
          if (cmd.id === commandId || cmd._id === commandId) {
            if (isFullUpdate) {
              // Pour les mises à jour complètes, remplacer tout l'objet
              const updatedCommand = { ...(updates as Command) };
              console.log('🔄 Mise à jour complète avec progression:', updatedCommand.progression);
              return updatedCommand;
            } else {
              // Pour les mises à jour partielles, fusionner les propriétés
              const updatedCommand = { ...cmd, ...updates };
              console.log('🔄 Mise à jour partielle avec progression:', updatedCommand.progression);
              return updatedCommand;
            }
          }
          return cmd;
        });
        
        // Mettre à jour la référence
        commandsRef.current = updatedCommands;
        
        console.log('🔄 State local mis à jour avec progression:', updatedCommands.find(cmd => cmd.id === commandId || cmd._id === commandId)?.progression);
        
        // Émettre l'événement pour notifier les autres composants
        emitCommandEvent('UPDATE', { commandId, updates, commands: updatedCommands });
        
        return updatedCommands;
      });
      
      // Nettoyer le timeout
      updateTimeoutsRef.current.delete(commandId);
    }, 50); // Délai de 50ms pour éviter les mises à jour trop fréquentes
    
    // Stocker le nouveau timeout
    updateTimeoutsRef.current.set(commandId, timeoutId);
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