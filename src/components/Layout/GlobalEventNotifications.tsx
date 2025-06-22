import { useEffect, useState } from 'react';
import { useCommandsContext } from '../Commands/CommandsContext';
import { useNotification } from '../../context/NotificationContext';
import { getStatusLabel } from '../../utils/statusConfig';
import { Command } from '../../types';

export const GlobalEventNotifications: React.FC = () => {
  const { commands } = useCommandsContext();
  const { addNotification } = useNotification();
  const [previousCommands, setPreviousCommands] = useState<Command[]>([]);

  useEffect(() => {
    // Initialiser sans comparer
    if (previousCommands.length === 0 && commands.length > 0) {
      setPreviousCommands(commands);
      return;
    }

    // Comparer les changements de statut
    if (previousCommands.length > 0 && commands.length > 0) {
      commands.forEach(command => {
        const previous = previousCommands.find(c => c._id === command._id);
        if (previous && previous.statut !== command.statut) {
          const message = `Commande ${command.numero}: ${getStatusLabel(previous.statut)} → ${getStatusLabel(command.statut)}`;
          addNotification(message, 'status_update', command.statut);
        }
      });
    }

    // Détecter les suppressions
    if (previousCommands.length > commands.length) {
        const deletedCommand = previousCommands.find(pc => !commands.some(c => c._id === pc._id));
        if (deletedCommand) {
            addNotification(`Commande ${deletedCommand.numero} supprimée.`, 'error');
        }
    }

    // Détecter les créations
    if (commands.length > previousCommands.length) {
        const createdCommand = commands.find(c => !previousCommands.some(pc => pc._id === c._id));
        if(createdCommand){
            addNotification(`Nouvelle commande créée: ${createdCommand.numero}`, 'success');
        }
    }

    setPreviousCommands(commands);
  }, [commands, addNotification]);

  return null; // Ce composant ne rend rien
}; 