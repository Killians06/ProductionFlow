import { useEffect } from 'react';

// Événements personnalisés pour la synchronisation en temps réel entre onglets
export const COMMAND_EVENTS = {
  UPDATE: 'command-update',
  DELETE: 'command-delete',
  CREATE: 'command-create',
  STATUS_CHANGE: 'command-status-change',
} as const;

// Clé pour le localStorage
const SYNC_STORAGE_KEY = 'command-sync-events';

// Fonction utilitaire pour émettre des événements (partagés entre onglets)
export const emitCommandEvent = (eventType: keyof typeof COMMAND_EVENTS, data: any) => {
  const eventData = {
    type: COMMAND_EVENTS[eventType],
    data,
    timestamp: Date.now(),
    tabId: Math.random().toString(36).substr(2, 9), // ID unique pour éviter les boucles
  };
  
  // Stocker dans localStorage pour déclencher l'événement storage dans les autres onglets
  localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(eventData));
  
  // Émettre aussi un événement local pour l'onglet actuel
  const event = new CustomEvent(COMMAND_EVENTS[eventType], { detail: data });
  window.dispatchEvent(event);
  
  // Nettoyer après un court délai pour éviter l'accumulation
  setTimeout(() => {
    localStorage.removeItem(SYNC_STORAGE_KEY);
  }, 100);
};

// Fonction utilitaire pour écouter les événements (locaux et inter-onglets)
export const useCommandEvents = (callback: (event: CustomEvent) => void, eventType: keyof typeof COMMAND_EVENTS) => {
  useEffect(() => {
    const handleLocalEvent = (event: CustomEvent) => callback(event);
    
    // Écouter les événements locaux
    window.addEventListener(COMMAND_EVENTS[eventType], handleLocalEvent as EventListener);
    
    // Écouter les événements de storage (autres onglets)
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === SYNC_STORAGE_KEY && event.newValue) {
        try {
          const eventData = JSON.parse(event.newValue);
          if (eventData.type === COMMAND_EVENTS[eventType]) {
            // Créer un événement CustomEvent pour maintenir la compatibilité
            const customEvent = new CustomEvent(COMMAND_EVENTS[eventType], { 
              detail: eventData.data 
            });
            callback(customEvent);
          }
        } catch (error) {
          console.error('Erreur lors du parsing de l\'événement de synchronisation:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    // Nettoyer les écouteurs
    return () => {
      window.removeEventListener(COMMAND_EVENTS[eventType], handleLocalEvent as EventListener);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [callback, eventType]);
};

// Fonction pour écouter tous les événements de commande
export const useAllCommandEvents = (callback: (eventType: string, data: any) => void) => {
  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === SYNC_STORAGE_KEY && event.newValue) {
        try {
          const eventData = JSON.parse(event.newValue);
          callback(eventData.type, eventData.data);
        } catch (error) {
          console.error('Erreur lors du parsing de l\'événement de synchronisation:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [callback]);
}; 