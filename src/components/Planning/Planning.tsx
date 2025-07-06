import React, { useState } from 'react';
import { Calendar, BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import { Timeline } from './Timeline';
import { GanttChart } from './GanttChart';
import { useCommandsContext } from '../Commands/CommandsContext';

export const Planning: React.FC = () => {
  const [view, setView] = useState<'timeline' | 'gantt'>('gantt');
  const { commands, loading, error } = useCommandsContext();

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur de chargement</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Planning de production</h2>
          <p className="mt-1 text-sm text-gray-600">
            Visualisez et planifiez vos commandes de production
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex rounded-md shadow-sm">
          <button
            onClick={() => setView('gantt')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md border transition-colors duration-200 ${
              view === 'gantt'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2 inline" />
            Gantt
          </button>
          <button
            onClick={() => setView('timeline')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b transition-colors duration-200 ${
              view === 'timeline'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Calendar className="h-4 w-4 mr-2 inline" />
            Timeline
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Chargement du planning...</span>
        </div>
      )}

      {/* Planning View */}
      {!loading && (
        <>
          {view === 'gantt' ? (
            <GanttChart commands={commands} />
          ) : (
            <Timeline commands={commands} />
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">
                {commands.filter(c => c.statut === 'in-production').length}
              </div>
              <div className="text-sm text-gray-500">En production</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">
                {commands.filter(c => new Date(c.dateLivraison) < new Date() && c.statut !== 'delivered').length}
              </div>
              <div className="text-sm text-gray-500">En retard</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">
                {commands.filter(c => {
                  const daysLeft = Math.ceil((new Date(c.dateLivraison).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  return daysLeft <= 7 && daysLeft > 0 && c.statut !== 'delivered';
                }).length}
              </div>
              <div className="text-sm text-gray-500">À livrer cette semaine</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">
                {commands.length > 0 ? Math.round(commands.reduce((sum, c) => sum + c.progression, 0) / commands.length) : 0}%
              </div>
              <div className="text-sm text-gray-500">Progression moyenne</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};