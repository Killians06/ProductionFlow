import express from 'express';
import Client from '../models/Client.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// GET /api/clients - Récupérer tous les clients de l'organisation
router.get('/', protect, async (req, res) => {
  try {
    const { search, actif } = req.query;
    
    let query = { organisation: req.user.organisationId };
    
    // Filtrage par statut actif/inactif
    if (actif !== undefined) {
      query.actif = actif === 'true';
    }
    
    // Recherche par nom de société, personne de contact ou email
    if (search) {
      query.$or = [
        { nomSociete: { $regex: search, $options: 'i' } },
        { 'personneContact.nom': { $regex: search, $options: 'i' } },
        { 'personneContact.prenom': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const clients = await Client.find(query)
      .sort({ nomSociete: 1 });
    
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/clients/:id - Récupérer un client par ID
router.get('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findOne({
      _id: req.params.id,
      organisation: req.user.organisationId
    });
    
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    res.json(client);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/clients - Créer un nouveau client
router.post('/', protect, async (req, res) => {
  try {
    const client = new Client({
      ...req.body,
      organisation: req.user.organisationId
    });
    
    await client.save();
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/clients/:id - Mettre à jour un client
router.put('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        organisation: req.user.organisationId
      },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    res.json(client);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/clients/:id - Supprimer un client (suppression logique)
router.delete('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        organisation: req.user.organisationId
      },
      { actif: false },
      { new: true }
    );
    
    if (!client) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }
    
    res.json({ message: 'Client désactivé avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 