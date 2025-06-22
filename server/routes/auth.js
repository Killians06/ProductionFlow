import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Organisation from '../models/Organisation.js';
import Invitation from '../models/Invitation.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nom, email, password, nomOrganisation, invitationToken } = req.body;

  try {
    let organisation;

    if (invitationToken) {
      // Scénario 1: Inscription via invitation
      const invitation = await Invitation.findOne({ 
        token: invitationToken, 
        status: 'pending',
        expires: { $gt: new Date() }
      });

      if (!invitation || invitation.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: 'Jeton d\'invitation invalide ou expiré.' });
      }

      organisation = await Organisation.findById(invitation.organisation);
      if (!organisation) {
        return res.status(400).json({ error: 'L\'organisation pour cette invitation n\'existe plus.' });
      }

      // Marquer l'invitation comme acceptée
      invitation.status = 'accepted';
      await invitation.save();

    } else {
      // Scénario 2: Inscription classique avec création d'organisation
      if (!nomOrganisation) {
        return res.status(400).json({ error: 'Le nom de l\'organisation est requis.' });
      }
      organisation = new Organisation({ nom: nomOrganisation });
      await organisation.save();
    }

    // Création de l'utilisateur
    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = new User({
      nom,
      email,
      passwordHash,
      organisation: organisation._id
    });
    await newUser.save();

    // Ajouter le nouvel utilisateur aux membres de l'organisation
    organisation.membres.push(newUser._id);
    await organisation.save();

    // Créer un token JWT pour la connexion automatique
    const token = jwt.sign(
      { userId: newUser._id, nom: newUser.nom, organisation: newUser.organisation },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ 
      token, 
      user: { _id: newUser._id, nom: newUser.nom, email: newUser.email, organisation: newUser.organisation }
    });
  } catch (error) {
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'inscription.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('organisation', 'nom');
    if (!user) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Identifiants invalides.' });
    }

    const token = jwt.sign(
      { userId: user._id, organisationId: user.organisation._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        organisation: user.organisation
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur lors de la connexion.' });
  }
});

export default router; 