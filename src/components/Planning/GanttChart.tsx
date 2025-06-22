import React from 'react';
import { Command } from '../../types';
import { formatDate, getDaysUntilDeadline } from '../../utils/dateUtils';
import { getStatusColor } from '../../utils/statusUtils';

interface GanttChartProps {
  commands: Command[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ commands }) => {
  // Calculate date range for the chart
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 30); // 30 days ago
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 60); // 60 days from now

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const getPositionAndWidth = (command: Command) => {
    const commandStart = command.dateCreation > startDate ? command.dateCreation : startDate;
    const commandEnd = command.dateLivraison < endDate ? command.dateLivraison : endDate;
    
    const startOffset = Math.ceil((commandStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((commandEnd.getTime() - commandStart.getTime()) / (1000 * 60 * 60 * 24));
    
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    
    return { left: Math.max(0, left), width: Math.max(2, width) };
  };

  // Generate week markers
  const weekMarkers = [];
  const currentWeek = new Date(startDate);
  while (currentWeek <= endDate) {
    const weekOffset = Math.ceil((currentWeek.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const position = (weekOffset / totalDays) * 100;
    
    weekMarkers.push({
      position,
      date: new Date(currentWeek),
      isToday: currentWeek.toDateString() === now.toDateString()
    });
    
    currentWeek.setDate(currentWeek.getDate() + 7);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Planning Gantt</h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time axis */}
          <div className="relative h-12 mb-4 border-b border-gray-200">
            {weekMarkers.map((marker, index) => (
              <div
                key={index}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${marker.position}%` }}
              >
                <div className={`w-px h-3 ${marker.isToday ? 'bg-red-500' : 'bg-gray-300'}`} />
                <span className={`text-xs mt-1 ${marker.isToday ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  {marker.date.getDate()}/{marker.date.getMonth() + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Commands */}
          <div className="space-y-3">
            {commands.map((command) => {
              const { left, width } = getPositionAndWidth(command);
              const isOverdue = getDaysUntilDeadline(command.dateLivraison) < 0 && command.statut !== 'delivered';
              
              return (
                <div key={command.id} className="relative h-12 bg-gray-50 rounded border">
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                      {command.numero}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">
                      {command.client.nom}
                    </div>
                  </div>
                  
                  <div
                    className={`absolute top-1 bottom-1 rounded transition-all duration-300 ${
                      isOverdue ? 'bg-red-500' : 
                      command.statut === 'delivered' ? 'bg-green-500' :
                      command.statut === 'in-production' ? 'bg-blue-500' :
                      'bg-yellow-500'
                    } opacity-75 hover:opacity-90`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <div className="flex items-center justify-end h-full pr-2">
                      <span className="text-white text-xs font-medium">
                        {command.progression}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
              <span>En attente/Validée</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span>En production</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span>Terminée</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
              <span>En retard</span>
            </div>
            <div className="flex items-center">
              <div className="w-px h-3 bg-red-500 mr-2"></div>
              <span>Aujourd'hui</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};