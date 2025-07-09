import express from 'express';
import Organisation from '../models/Organisation.js';
import History from '../models/History.js';
import sendStatusUpdateMail from '../utils/sendStatusUpdateMail.js';
import { emitCommandCreated, emitCommandUpdated, emitCommandDeleted } from '../utils/socketEvents.js';

const router = express.Router();

// GET /api/commands - Récupérer toutes les commandes de l'organisation
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50, organisation } = req.query;
    
    // Trouver l'organisation et ses commandes
    const organisationDoc = await Organisation.findById(organisation || req.user.organisationId)
      .populate('commandes.etapesProduction.responsable', 'nom')
      .populate('commandes.clientId');
    
    if (!organisationDoc) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    let commands = organisationDoc.commandes;

    // Trier par date de création décroissante (plus récentes en premier)
    commands = commands.sort((a, b) => {
      const dateA = new Date(a.dateCreation || a.createdAt || 0);
      const dateB = new Date(b.dateCreation || b.createdAt || 0);
      return dateB - dateA; // Décroissant
    });

    // Filtrer par statut
    if (status && status !== 'all') {
      commands = commands.filter(cmd => cmd.statut === status);
    }

    // Filtrer par recherche
    if (search) {
      const searchLower = search.toLowerCase();
      commands = commands.filter(cmd => 
        cmd.numero.toLowerCase().includes(searchLower) ||
        cmd.client.nom.toLowerCase().includes(searchLower)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedCommands = commands.slice(startIndex, endIndex);

    res.json({
      commands: paginatedCommands,
      total: commands.length,
      page: parseInt(page),
      totalPages: Math.ceil(commands.length / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/commands/:id - Récupérer une commande spécifique
router.get('/:id', async (req, res) => {
  try {
    const organisationDoc = await Organisation.findById(req.user.organisationId)
      .populate('commandes.etapesProduction.responsable', 'nom')
      .populate('commandes.clientId');
    
    if (!organisationDoc) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    const command = organisationDoc.commandes.find(cmd => 
      cmd._id.toString() === req.params.id || 
      cmd.commandId.toString() === req.params.id
    );

    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.json(command);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/commands - Créer une nouvelle commande
router.post('/', async (req, res) => {
  try {
    console.log('Données reçues pour création de commande:', JSON.stringify(req.body, null, 2));
    
    const organisationDoc = await Organisation.findById(req.user.organisationId);
    if (!organisationDoc) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    // Générer l'ID relatif et le numéro
    const commandId = organisationDoc.nextCommandId;
    const numero = `CMD-${new Date().getFullYear()}-${String(commandId).padStart(3, '0')}`;
    
    const commandData = {
      commandId,
      numero,
      ...req.body
    };

    console.log('Données de commande après traitement:', JSON.stringify(commandData, null, 2));

    // Si des étapes de production sont définies, s'assurer que la première est "en cours"
    if (commandData.etapesProduction && commandData.etapesProduction.length > 0) {
      console.log('Étapes de production trouvées:', commandData.etapesProduction.length);
      commandData.etapesProduction = commandData.etapesProduction.map((etape, index) => {
        if (index === 0) {
          return { ...etape, statut: 'in-progress', dateDebut: new Date() };
        }
        return { ...etape, statut: etape.statut || 'pending' };
      });
    } else {
      console.log('Aucune étape de production trouvée');
    }

    // Ajouter la commande à l'organisation
    organisationDoc.commandes.push(commandData);
    organisationDoc.nextCommandId = commandId + 1;
    
    await organisationDoc.save();

    // Récupérer la commande créée avec les populations
    const populatedCommand = organisationDoc.commandes[organisationDoc.commandes.length - 1];
    await organisationDoc.populate('commandes.etapesProduction.responsable', 'nom');
    await organisationDoc.populate('commandes.clientId');

    // Enregistrer l'action dans l'historique
    const historyEntry = new History({
      user: req.user.userId,
      action: 'CREATE_COMMAND',
      entity: 'Command',
      entityId: populatedCommand._id,
      changes: {
        message: `Commande créée avec le numéro ${populatedCommand.numero}`
      }
    });
    await historyEntry.save();

    // Émettre l'événement de création pour la synchronisation en temps réel
    emitCommandCreated(populatedCommand, req.user.organisationId);

    res.status(201).json(populatedCommand);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/commands/:id - Mettre à jour une commande
router.put('/:id', async (req, res) => {
  try {
    const organisationDoc = await Organisation.findById(req.user.organisationId);
    if (!organisationDoc) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    const commandIndex = organisationDoc.commandes.findIndex(cmd => 
      cmd._id.toString() === req.params.id || 
      cmd.commandId.toString() === req.params.id
    );

    if (commandIndex === -1) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Mettre à jour la commande
    organisationDoc.commandes[commandIndex] = {
      ...organisationDoc.commandes[commandIndex],
      ...req.body
    };

    await organisationDoc.save();
    await organisationDoc.populate('commandes.etapesProduction.responsable', 'nom');
    await organisationDoc.populate('commandes.clientId');

    const updatedCommand = organisationDoc.commandes[commandIndex];
    
    // Enregistrer l'action dans l'historique
    const historyEntry = new History({
      user: req.user.userId,
      action: 'UPDATE_COMMAND',
      entity: 'Command',
      entityId: updatedCommand._id,
      changes: {
        message: `La commande a été mise à jour.`
      }
    });
    await historyEntry.save();

    // Émettre l'événement de mise à jour pour la synchronisation en temps réel
    emitCommandUpdated(updatedCommand._id, req.body, req.user.organisationId);

    res.json(updatedCommand);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/commands/:id - Supprimer une commande
router.delete('/:id', async (req, res) => {
  try {
    const organisationDoc = await Organisation.findById(req.user.organisationId);
    if (!organisationDoc) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    const commandIndex = organisationDoc.commandes.findIndex(cmd => 
      cmd._id.toString() === req.params.id || 
      cmd.commandId.toString() === req.params.id
    );

    if (commandIndex === -1) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const commandToDelete = organisationDoc.commandes[commandIndex];
    
    // Supprimer la commande
    organisationDoc.commandes.splice(commandIndex, 1);
    await organisationDoc.save();

    // Enregistrer l'action dans l'historique
    const historyEntry = new History({
      user: req.user.userId,
      action: 'DELETE_COMMAND',
      entity: 'Command',
      entityId: commandToDelete._id,
      changes: {
        message: `Commande #${commandToDelete.numero} supprimée.`
      }
    });
    await historyEntry.save();

    // Émettre l'événement de suppression pour la synchronisation en temps réel
    emitCommandDeleted(commandToDelete._id, req.user.organisationId);

    res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/commands/:id/status - Mettre à jour le statut d'une commande
router.put('/:id/status', async (req, res) => {
  try {
    const { statut, progression, notifierClient } = req.body;
    
    const organisationDoc = await Organisation.findById(req.user.organisationId)
      .populate('commandes.etapesProduction.responsable', 'nom')
      .populate('commandes.clientId');
    
    if (!organisationDoc) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    const commandIndex = organisationDoc.commandes.findIndex(cmd => 
      cmd._id.toString() === req.params.id || 
      cmd.commandId.toString() === req.params.id
    );

    if (commandIndex === -1) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const commandBeforeUpdate = organisationDoc.commandes[commandIndex];
    const oldStatus = commandBeforeUpdate.statut;

    // Forcer la progression à 100% si le statut est terminé, sinon recalculer
    let newProgression = progression;
    if (["ready", "shipped", "delivered"].includes(statut)) {
      newProgression = 100;
    } else {
      // Recalculer la progression selon les étapes terminées
      if (commandBeforeUpdate.etapesProduction && commandBeforeUpdate.etapesProduction.length > 0) {
        const completedSteps = commandBeforeUpdate.etapesProduction.filter(e => e.statut === 'completed').length;
        newProgression = Math.round((completedSteps / commandBeforeUpdate.etapesProduction.length) * 100);
      } else {
        newProgression = 0;
      }
    }

    // Mettre à jour le statut et la progression
    organisationDoc.commandes[commandIndex].statut = statut;
    organisationDoc.commandes[commandIndex].progression = newProgression;

    await organisationDoc.save();
    
    const updatedCommand = organisationDoc.commandes[commandIndex];
    
    let emailSent = false;
    let previewUrl = undefined;
    if (notifierClient) {
      try {
        previewUrl = await sendStatusUpdateMail(updatedCommand, statut);
        console.log('Mail envoyé à', updatedCommand.client.email);
        emailSent = true;
      } catch (error) {
        console.error('Erreur lors de l\'envoi du mail:', error);
      }
    }

    // Enregistrer l'action dans l'historique
    const historyEntry = new History({
      user: req.user.userId,
      action: 'UPDATE_STATUS',
      entity: 'Command',
      entityId: updatedCommand._id,
      changes: {
        message: `Statut changé de ${oldStatus} à ${statut}`,
        oldStatus,
        newStatus: statut,
        emailSent
      }
    });
    await historyEntry.save();

    // Émettre l'événement de mise à jour pour la synchronisation en temps réel
    emitCommandUpdated(updatedCommand._id, { statut, progression: newProgression }, req.user.organisationId);

    res.json({
      command: updatedCommand,
      emailSent,
      previewUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/commands/:id/history - Récupérer l'historique d'une commande
router.get('/:id/history', async (req, res) => {
  try {
    const organisationDoc = await Organisation.findById(req.user.organisationId);
    if (!organisationDoc) {
      return res.status(404).json({ error: 'Organisation non trouvée' });
    }

    const command = organisationDoc.commandes.find(cmd => 
      cmd._id.toString() === req.params.id || 
      cmd.commandId.toString() === req.params.id
    );

    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const history = await History.find({
      entity: 'Command',
      entityId: command._id
    }).populate('user', 'nom email').sort({ timestamp: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;