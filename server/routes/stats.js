import express from 'express';
import Organisation from '../models/Organisation.js';

const router = express.Router();

// GET /api/stats - Récupérer les statistiques du dashboard
router.get('/', async (req, res) => {
  try {
    const organisation = await Organisation.findById(req.user.organisationId)
      .populate('commandes.etapesProduction.responsable', 'nom')
      .populate('commandes.clientId');
    
    if (!organisation) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    const commands = organisation.commandes;

    // Calculer les statistiques
    const totalCommands = commands.length;
    const inProgress = commands.filter(cmd => 
      ['validated', 'in-production', 'quality-check'].includes(cmd.statut)
    ).length;
    const completed = commands.filter(cmd => 
      ['ready', 'shipped', 'delivered'].includes(cmd.statut)
    ).length;
    const delayed = commands.filter(cmd => {
      const deliveryDate = new Date(cmd.dateLivraison);
      const today = new Date();
      return deliveryDate < today && !['ready', 'shipped', 'delivered'].includes(cmd.statut);
    }).length;

    // Calculer le revenu (exemple simple)
    const revenue = commands
      .filter(cmd => ['ready', 'shipped', 'delivered'].includes(cmd.statut))
      .reduce((sum, cmd) => {
        const productValue = cmd.produits.reduce((pSum, p) => pSum + (p.quantite * 100), 0); // 100€ par produit
        return sum + productValue;
      }, 0);

    // Calculer le temps de production moyen
    const completedCommands = commands.filter(cmd => 
      ['ready', 'shipped', 'delivered'].includes(cmd.statut)
    );
    
    const averageProductionTime = completedCommands.length > 0 
      ? completedCommands.reduce((sum, cmd) => {
          const creationDate = new Date(cmd.dateCreation);
          const completionDate = new Date(cmd.dateLivraison);
          return sum + (completionDate - creationDate) / (1000 * 60 * 60 * 24); // en jours
        }, 0) / completedCommands.length
      : 0;

    // Commandes récentes (5 plus récentes)
    const recentCommands = commands
      .sort((a, b) => new Date(b.dateCreation) - new Date(a.dateCreation))
      .slice(0, 5);

    // Commandes urgentes (livraison dans les 3 prochains jours ou en retard)
    const urgentDate = new Date();
    urgentDate.setDate(urgentDate.getDate() + 3);
    
    const urgentCommands = commands.filter(cmd => {
      const deliveryDate = new Date(cmd.dateLivraison);
      const isUrgent = deliveryDate <= urgentDate;
      const isNotCompleted = !['ready', 'shipped', 'delivered', 'canceled'].includes(cmd.statut);
      return isUrgent && isNotCompleted;
    }).sort((a, b) => new Date(a.dateLivraison) - new Date(b.dateLivraison));

    res.json({
      stats: {
        totalCommands,
        inProgress,
        completed,
        delayed,
        revenue,
        averageProductionTime: Math.round(averageProductionTime)
      },
      recentCommands,
      urgentCommands
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;