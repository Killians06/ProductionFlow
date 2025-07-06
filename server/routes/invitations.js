import express from 'express';
import protect from '../middleware/auth.js';
import Invitation from '../models/Invitation.js';
import User from '../models/User.js';
import sendInvitationMail from '../utils/sendInvitationMail.js';

const router = express.Router();

// POST /api/invitations - Envoyer une invitation
router.post('/', protect, async (req, res) => {
  const { email } = req.body;
  const organisationId = req.user.organisation || req.user.organisationId;
  const inviterId = req.user._id || req.user.userId;

  try {
    // Vérifier si l'utilisateur est déjà dans l'organisation
    const existingUser = await User.findOne({ email, organisation: organisationId });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet utilisateur est déjà membre de votre organisation.' });
    }

    // Vérifier s'il y a déjà une invitation en attente pour cet email
    const existingInvitation = await Invitation.findOne({ email, organisation: organisationId, status: 'pending' });
    if (existingInvitation && existingInvitation.expires > new Date()) {
      return res.status(400).json({ error: 'Une invitation a déjà été envoyée à cette adresse e-mail.' });
    }

    // Créer et sauvegarder la nouvelle invitation
    const invitation = new Invitation({
      email,
      organisation: organisationId,
    });
    await invitation.save();

    // Envoyer l'e-mail d'invitation
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?token=${invitation.token}`;
    await sendInvitationMail(email, invitationLink);

    res.status(201).json({ message: `L'invitation a été envoyée à ${email}.` });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'invitation :", error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'envoi de l\'invitation.' });
  }
});

// GET /api/invitations/pending - Lister les invitations en attente pour l'organisation
router.get('/pending', protect, async (req, res) => {
  const organisationId = req.user.organisation || req.user.organisationId;
  try {
    const invitations = await Invitation.find({
      organisation: organisationId,
      status: 'pending',
      expires: { $gt: new Date() }
    }).sort({ createdAt: -1 });
    res.status(200).json({ invitations });
  } catch (error) {
    console.error('Erreur lors de la récupération des invitations en attente :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des invitations.' });
  }
});

// GET /api/invitations/:token - Récupérer les détails d'une invitation
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    // Recherche une invitation en attente et non expirée
    const invitation = await Invitation.findOne({ 
      token: token, 
      status: 'pending', 
      expires: { $gt: new Date() } 
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation non valide ou expirée.' });
    }

    // Renvoie l'email associé à l'invitation
    res.status(200).json({ email: invitation.email });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'invitation :", error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération de l\'invitation.' });
  }
});

// DELETE /api/invitations/:id - Supprimer une invitation en attente
router.delete('/:id', protect, async (req, res) => {
  const organisationId = req.user.organisation || req.user.organisationId;
  const invitationId = req.params.id;
  try {
    const invitation = await Invitation.findOne({ _id: invitationId, organisation: organisationId, status: 'pending' });
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation non trouvée ou déjà traitée.' });
    }
    await Invitation.deleteOne({ _id: invitationId });
    res.status(200).json({ message: 'Invitation supprimée.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'invitation :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'invitation.' });
  }
});

export default router; 