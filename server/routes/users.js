import express from 'express';
import User from '../models/User.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// GET /api/users - Récupérer les utilisateurs de l'organisation
router.get('/', protect, async (req, res) => {
  try {
    // req.user est peuplé par le middleware 'protect'
    const organisationId = req.user.organisation || req.user.organisationId;
    if (!req.user || !organisationId) {
      return res.status(400).json({ message: 'Utilisateur ou organisation non trouvé' });
    }

    const users = await User.find({ organisation: organisationId })
      .select('nom email role'); // On ne renvoie que les champs utiles

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des utilisateurs.' });
  }
});

export default router; 