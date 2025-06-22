import { useState, useEffect } from 'react';
import { statsApi } from '../services/api';
import { Command } from '../types';
import { COMMAND_EVENTS, useCommandEvents } from '../utils/syncEvents';
import { useCommandsContext } from '../components/Commands/CommandsContext';

interface StatsData {
  stats: {
    totalCommands: number;
    inProgress: number;
    completed: number;
    delayed: number;
    revenue: number;
    averageProductionTime: number;
  };
  recentCommands: Command[];
  urgentCommands: Command[];
}

export const useStats = () => {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Rendre l'utilisation du contexte optionnelle
  let commands: Command[] = [];
  try {
    const context = useCommandsContext();
    commands = context.commands;
  } catch (error) {
    // Le contexte n'est pas disponible, on utilise un tableau vide
    commands = [];
  }

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await statsApi.getDashboard();
      
      // Parse les dates des commandes
      const parseCommandDates = (cmd: any) => ({
        ...cmd,
        id: cmd.id || cmd._id,
        dateLivraison: cmd.dateLivraison ? new Date(cmd.dateLivraison) : undefined,
        dateCreation: cmd.dateCreation ? new Date(cmd.dateCreation) : undefined,
      });

      const parsedData = {
        stats: response.stats,
        recentCommands: response.recentCommands?.map(parseCommandDates) || [],
        urgentCommands: response.urgentCommands?.map(parseCommandDates) || [],
      };

      setData(parsedData);
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error('Erreur fetchStats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques optimistes basées sur les commandes du contexte
  const calculateOptimisticStats = (baseData: StatsData): StatsData => {
    const now = new Date();
    
    // Calculer les nouvelles statistiques basées sur les commandes actuelles
    const totalCommands = commands.length;
    const inProgress = commands.filter(cmd => ['validated', 'in-production', 'quality-check'].includes(cmd.statut)).length;
    const completed = commands.filter(cmd => ['ready', 'shipped', 'delivered'].includes(cmd.statut)).length;
    const delayed = commands.filter(cmd => {
      const deliveryDate = new Date(cmd.dateLivraison);
      return deliveryDate < now && !['ready', 'shipped', 'delivered', 'canceled'].includes(cmd.statut);
    }).length;

    // Calculer le chiffre d'affaires (exemple simplifié)
    const revenue = commands.reduce((sum, cmd) => {
      // Logique simplifiée pour le calcul du CA
      return sum + (cmd.produits?.reduce((prodSum, prod) => prodSum + (prod.quantite * 100), 0) || 0);
    }, 0);

    // Calculer le temps moyen de production
    const productionTimes = commands
      .filter(cmd => cmd.statut === 'delivered')
      .map(cmd => {
        const creation = new Date(cmd.dateCreation);
        const delivery = new Date(cmd.dateLivraison);
        return Math.ceil((delivery.getTime() - creation.getTime()) / (1000 * 60 * 60 * 24));
      });
    
    const averageProductionTime = productionTimes.length > 0 
      ? Math.round(productionTimes.reduce((sum, time) => sum + time, 0) / productionTimes.length)
      : baseData.stats.averageProductionTime;

    // Mettre à jour les commandes récentes et urgentes
    const recentCommands = commands
      .sort((a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime())
      .slice(0, 5);

    const nonCompletedStatuses = ['draft', 'validated', 'in-production', 'quality-check'];
    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 3);
    
    const urgentCommands = commands
      .filter(cmd => {
        const deliveryDate = new Date(cmd.dateLivraison);
        return deliveryDate <= urgentDate && nonCompletedStatuses.includes(cmd.statut);
      })
      .sort((a, b) => new Date(a.dateLivraison).getTime() - new Date(b.dateLivraison).getTime());

    return {
      stats: {
        totalCommands,
        inProgress,
        completed,
        delayed,
        revenue,
        averageProductionTime,
      },
      recentCommands,
      urgentCommands,
    };
  };

  // Mettre à jour les statistiques quand les commandes changent
  useEffect(() => {
    if (data && commands.length > 0) {
      const optimisticData = calculateOptimisticStats(data);
      setData(optimisticData);
    }
  }, [commands]); // Seulement les commandes comme dépendance

  // Chargement initial
  useEffect(() => {
    fetchStats();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchStats,
  };
}; 