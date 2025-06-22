import express from 'express';
import Command from '../models/Command.js';

const router = express.Router();

// GET /api/stats - Récupérer les statistiques du tableau de bord
router.get('/', async (req, res) => {
  try {
    const orgFilter = { organisation: req.user.organisationId };

    const totalCommands = await Command.countDocuments(orgFilter);
    const inProgress = await Command.countDocuments({ 
      ...orgFilter,
      statut: { $in: ['validated', 'in-production', 'quality-check'] } 
    });
    const completed = await Command.countDocuments({ 
      ...orgFilter,
      statut: { $in: ['ready', 'shipped', 'delivered'] } 
    });
    
    const nonCompletedStatuses = ['draft', 'validated', 'in-production', 'quality-check'];
    
    // Commandes en retard (date de livraison dépassée et non terminées)
    const delayed = await Command.countDocuments({
      ...orgFilter,
      dateLivraison: { $lt: new Date() },
      statut: { $in: nonCompletedStatuses }
    });
    
    // Calcul du chiffre d'affaires (basé sur les commandes livrées)
    const deliveredCommands = await Command.find({ ...orgFilter, statut: 'delivered' });
    const revenue = deliveredCommands.reduce((sum, cmd) => {
      return sum + cmd.produits.reduce((prodSum, prod) => prodSum + (prod.quantite * 100), 0);
    }, 0);
    
    // Temps moyen de production (simulation)
    const averageProductionTime = 6.2;
    
    // Commandes récentes
    const recentCommands = await Command.find(orgFilter)
      .sort({ dateCreation: -1 })
      .limit(5)
      .populate('etapesProduction.responsable', 'nom')
      .populate('clientId');
    
    // Commandes urgentes (livraison dans les 3 prochains jours ET celles déjà en retard)
    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 3);
    
    const urgentCommands = await Command.find({
      ...orgFilter,
      dateLivraison: { $lte: urgentDate }, // Inclut les dates passées
      statut: { $in: nonCompletedStatuses } // Exclut les commandes terminées ou annulées
    })
    .sort({ dateLivraison: 1 }) // Trie par date de livraison, les plus urgentes en premier
    .populate('etapesProduction.responsable', 'nom')
    .populate('clientId');
    
    res.json({
      stats: {
        totalCommands,
        inProgress,
        completed,
        delayed,
        revenue,
        averageProductionTime
      },
      recentCommands,
      urgentCommands
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;