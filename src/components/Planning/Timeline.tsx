import React from 'react';
import { Command } from '../../types';
import { formatDate } from '../../utils/dateUtils';
import { getStatusColor } from '../../utils/statusUtils';

interface TimelineProps {
  commands: Command[];
}

export const Timeline: React.FC<TimelineProps> = ({ commands }) => {
  // Sort commands by creation date
  const sortedCommands = [...commands].sort((a, b) => 
    new Date(a.dateCreation).getTime() - new Date(b.dateCreation).getTime()
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Timeline des commandes</h3>
      
      <div className="flow-root">
        <ul className="-mb-8">
          {sortedCommands.map((command, commandIdx) => (
            <li key={command.id}>
              <div className="relative pb-8">
                {commandIdx !== sortedCommands.length - 1 ? (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                      command.statut === 'delivered' ? 'bg-green-500' :
                      command.statut === 'in-production' ? 'bg-blue-500' :
                      command.statut === 'validated' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}>
                      <span className="h-2 w-2 bg-white rounded-full" />
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {command.numero} - {command.client.nom}
                      </p>
                      <div className="mt-1 space-y-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(command.statut)}`}>
                          {command.statut}
                        </span>
                        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 mt-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              command.progression === 100 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${command.progression}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">{command.progression}% terminé</p>
                      </div>
                    </div>
                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                      <time>{formatDate(command.dateCreation)}</time>
                      <p className="text-xs mt-1">Livraison: {formatDate(command.dateLivraison)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};