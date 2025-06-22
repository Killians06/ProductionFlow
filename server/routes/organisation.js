import express from 'express';
import authMiddleware from '../middleware/auth.js';
import Organisation from '../models/Organisation.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/organisation/
// Récupère les détails de l'organisation de l'utilisateur connecté
router.get('/', async (req, res) => {
  try {
    const organisation = await Organisation.findById(req.user.organisationId).populate('membres', 'nom email role');
    
    if (!organisation) {
      return res.status(404).json({ error: "Organisation non trouvée." });
    }

    res.json(organisation);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'organisation:", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router; 