import express from 'express';
import Command from '../models/Command.js';
import History from '../models/History.js';
import sendStatusUpdateMail from '../utils/sendStatusUpdateMail.js';
import { emitCommandCreated, emitCommandUpdated, emitCommandDeleted, emitStatusChanged, emitStepUpdated, emitCommandFullyUpdated } from '../utils/socketEvents.js';

const router = express.Router();

// GET /api/commands - Récupérer toutes les commandes
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    
    let query = { organisation: req.user.organisationId }; // Filtrer par organisation
    
    // Filtrage par statut
    if (status && status !== 'all') {
      query.statut = status;
    }
    
    // Recherche par numéro ou nom client
    if (search) {
      const searchConditions = [
        { numero: { $regex: search, $options: 'i' } },
        { 'client.nom': { $regex: search, $options: 'i' } }
      ];
      
      // Si on a déjà des conditions (comme le statut), on utilise $and
      if (Object.keys(query).length > 1) {
        query = {
          $and: [
            { organisation: req.user.organisationId },
            { $or: searchConditions }
          ]
        };
        if (status && status !== 'all') {
          query.$and.push({ statut: status });
        }
      } else {
        query.$or = searchConditions;
      }
    }
    
    console.log('Query MongoDB:', JSON.stringify(query, null, 2));
    
    const commands = await Command.find(query)
      .populate('etapesProduction.responsable', 'nom')
      .populate('clientId')
      .sort({ dateCreation: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Command.countDocuments(query);
    
    res.json({
      commands,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Erreur dans la route GET /commands:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/commands/:id - Récupérer une commande par ID
router.get('/:id', async (req, res) => {
  try {
    const command = await Command.findOne({
      _id: req.params.id,
      organisation: req.user.organisationId
    });
    
    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Migration "à la volée" des anciennes données
    // @ts-ignore
    if (command.etapes && Array.isArray(command.etapes) && command.etapes.length > 0) {
      console.log(`Migration des étapes pour la commande ${command._id}`);
      command.etapesProduction = command.etapes;
      // @ts-ignore
      command.etapes = undefined;
      await command.save();
    }

    // Re-populer la commande après une éventuelle migration
    const populatedCommand = await Command.findById(command._id)
      .populate('etapesProduction.responsable', 'nom')
      .populate('clientId');

    res.json(populatedCommand);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/commands - Créer une nouvelle commande
router.post('/', async (req, res) => {
  try {
    console.log('Données reçues pour création de commande:', JSON.stringify(req.body, null, 2));
    
    const count = await Command.countDocuments();
    const numero = `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    
    const commandData = {
      ...req.body,
      numero,
      organisation: req.user.organisationId
    };

    console.log('Données de commande après traitement:', JSON.stringify(commandData, null, 2));

    // Si des étapes de production sont définies, s'assurer que la première est "en cours"
    if (commandData.etapesProduction && commandData.etapesProduction.length > 0) {
      console.log('Étapes de production trouvées:', commandData.etapesProduction.length);
      // S'assurer que toutes les étapes ont un statut par défaut "pending", sauf la première
      commandData.etapesProduction = commandData.etapesProduction.map((etape, index) => {
        if (index === 0) {
          // La première étape commence en 'in-progress'
          return { ...etape, statut: 'in-progress', dateDebut: new Date() };
        }
        // Les autres sont en 'pending' par défaut
        return { ...etape, statut: etape.statut || 'pending' };
      });
    } else {
      console.log('Aucune étape de production trouvée');
    }

    const command = new Command(commandData);
    
    await command.save();

    // Enregistrer l'action dans l'historique
    const historyEntry = new History({
      user: req.user.userId,
      action: 'CREATE_COMMAND',
      entity: 'Command',
      entityId: command._id,
      changes: {
        message: `Commande créée avec le numéro ${command.numero}`
      }
    });
    await historyEntry.save();

    // Peupler les responsables avant de renvoyer la commande
    const populatedCommand = await Command.findById(command._id)
      .populate('etapesProduction.responsable', 'nom')
      .populate('clientId');

    // Émettre l'événement de création pour la synchronisation en temps réel
    emitCommandCreated(populatedCommand);

    res.status(201).json(populatedCommand);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/commands/:id - Mettre à jour une commande
router.put('/:id', async (req, res) => {
  try {
    const command = await Command.findOneAndUpdate(
      {
        _id: req.params.id,
        organisation: req.user.organisationId
      },
      req.body,
      { new: true, runValidators: true }
    ).populate('etapesProduction.responsable', 'nom')
     .populate('clientId');
    
    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }
    
    // Enregistrer l'action dans l'historique
    const historyEntry = new History({
      user: req.user.userId,
      action: 'UPDATE_COMMAND',
      entity: 'Command',
      entityId: command._id,
      changes: {
        message: `La commande a été mise à jour.`
      }
    });
    await historyEntry.save();

    // Émettre l'événement de mise à jour pour la synchronisation en temps réel
    emitCommandUpdated(command._id, req.body);

    res.json(command);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/commands/:id - Supprimer une commande
router.delete('/:id', async (req, res) => {
  try {
    const command = await Command.findOneAndDelete({
      _id: req.params.id,
      organisation: req.user.organisationId
    });
    
    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    // Enregistrer l'action dans l'historique
    const historyEntry = new History({
      user: req.user.userId,
      action: 'DELETE_COMMAND',
      entity: 'Command',
      entityId: command._id,
      changes: {
        message: `Commande #${command.numero} supprimée.`
      }
    });
    await historyEntry.save();

    // Émettre l'événement de suppression pour la synchronisation en temps réel
    emitCommandDeleted(command._id);

    res.json({ message: 'Commande supprimée avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/commands/:id/status - Mettre à jour le statut d'une commande
router.put('/:id/status', async (req, res) => {
  try {
    const { statut, progression, notifierClient } = req.body;
    
    const commandBeforeUpdate = await Command.findOne({
      _id: req.params.id,
      organisation: req.user.organisationId
    }).populate('etapesProduction.responsable', 'nom')
     .populate('clientId');
    
    if (!commandBeforeUpdate) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const oldStatus = commandBeforeUpdate.statut;

    // Forcer la progression à 100% si le statut est terminé, sinon recalculer
    let newProgression = progression;
    if (["ready", "shipped", "delivered"].includes(statut)) {
      newProgression = 100;
    } else {
      // Recalculer la progression selon les étapes terminées
      const commandObj = await Command.findById(req.params.id);
      if (commandObj && commandObj.etapesProduction && commandObj.etapesProduction.length > 0) {
        const completedSteps = commandObj.etapesProduction.filter(e => e.statut === 'completed').length;
        newProgression = Math.round((completedSteps / commandObj.etapesProduction.length) * 100);
      } else {
        newProgression = 0;
      }
    }

    const command = await Command.findOneAndUpdate(
      {
        _id: req.params.id,
        organisation: req.user.organisationId
      },
      { statut, progression: newProgression },
      { new: true, runValidators: true }
    ).populate('etapesProduction.responsable', 'nom')
     .populate('clientId');
    
    let emailSent = false;
    let previewUrl = undefined;
    if (notifierClient) {
      try {
        previewUrl = await sendStatusUpdateMail(command, statut);
        console.log('Mail envoyé à', command.client.email);
        emailSent = true;
        // Chercher la dernière entrée UPDATE_STATUS pour cette commande et cet utilisateur dans les 10s
        const lastStatusHistory = await History.findOne({
          entity: 'Command',
          entityId: command._id,
          action: 'UPDATE_STATUS',
          user: req.user.userId
        }).sort({ timestamp: -1 });
        const now = new Date();
        if (lastStatusHistory && (now - lastStatusHistory.timestamp) < 10000) {
          // Mettre à jour mailSent sur la dernière entrée
          lastStatusHistory.mailSent = true;
          await lastStatusHistory.save();
        } else {
          // Ajouter une entrée d'historique dédiée pour l'envoi de mail
          const mailHistory = new History({
            user: req.user.userId,
            action: 'SEND_STATUS_MAIL',
            entity: 'Command',
            entityId: command._id,
            changes: {
              message: `Un email de notification a été envoyé au client (${command.client.email}) pour le statut : ${statut}`,
              statut: statut
            },
            mailSent: true,
          });
          await mailHistory.save();
        }
      } catch (mailErr) {
        console.error('Erreur lors de l\'envoi du mail:', mailErr);
        // On n'arrête pas la requête, mais on peut renvoyer un warning
      }
    }

    // Enregistrer l'action dans l'historique (après tentative d'envoi de mail)
    if (oldStatus !== statut) {
      const historyEntry = new History({
        user: req.user.userId,
        action: 'UPDATE_STATUS',
        entity: 'Command',
        entityId: command._id,
        changes: {
          from: oldStatus,
          to: statut,
        },
        mailSent: emailSent,
      });
      await historyEntry.save();
    }

    // Recharger la commande depuis la base pour avoir la progression à jour
    const updatedCommand = await Command.findById(command._id);

    console.log('[SOCKET][STATUS_CHANGED] CommandId:', command._id, '| Statut:', statut, '| Progression envoyée:', updatedCommand.progression);
    emitStatusChanged(command._id, statut, updatedCommand.progression);

    if (previewUrl) {
      return res.json({ command, previewUrl });
    } else {
      return res.json({ command });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/commands/:id/steps/:stepId/assign - Assigner un responsable à une étape
router.put('/:id/steps/:stepId/assign', async (req, res) => {
  try {
    const { userId } = req.body;
    const { id, stepId } = req.params;

    const command = await Command.findById(id);
    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const step = command.etapesProduction.id(stepId);
    if (!step) {
      return res.status(404).json({ error: 'Étape de production non trouvée' });
    }

    step.responsable = userId;
    
    // Mettre à jour la progression globale de la commande
    const completedSteps = command.etapesProduction.filter(e => e.statut === 'completed').length;
    command.progression = Math.round((completedSteps / command.etapesProduction.length) * 100);
    
    await command.save();

    // Re-populer avant de renvoyer la réponse
    await command.populate('etapesProduction.responsable', 'nom');
    await command.populate('clientId');

    // Enregistrer l'historique (optionnel mais recommandé)
    const historyEntry = new History({
      user: req.user.userId,
      action: 'ASSIGN_STEP',
      entity: 'Command',
      entityId: command._id,
      changes: {
        message: `L'étape "${step.nom}" a été assignée.`,
        stepId: step._id,
        assignedTo: userId,
      }
    });
    await historyEntry.save();

    // Émettre l'événement de mise à jour d'étape pour la synchronisation en temps réel
    emitStepUpdated(command._id, stepId, { 
      etapesProduction: command.etapesProduction 
    });

    // Émettre l'événement de mise à jour complète de commande pour les barres de progression
    emitCommandFullyUpdated(command);

    res.json(command);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/commands/:id/history - Récupérer l'historique d'une commande
router.get('/:id/history', async (req, res) => {
  try {
    const history = await History.find({ entityId: req.params.id })
      .populate('user', 'nom') // Récupérer uniquement le nom de l'utilisateur
      .sort({ timestamp: -1 }); // Trier par date, du plus récent au plus ancien

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/commands/:id/etapes/:etapeId/status - Mettre à jour le statut d'une étape
router.put('/:id/etapes/:etapeId/status', async (req, res) => {
  try {
    console.log('Mise à jour statut étape - Paramètres reçus:', {
      commandId: req.params.id,
      etapeId: req.params.etapeId,
      body: req.body
    });

    const { status } = req.body;
    const command = await Command.findOne({
      _id: req.params.id,
      organisation: req.user.organisationId,
    });

    if (!command) {
      console.log('Commande non trouvée:', req.params.id);
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    console.log('Commande trouvée, étapes:', command.etapesProduction.length);

    const etapeIndex = command.etapesProduction.findIndex(e => e._id.toString() === req.params.etapeId);

    console.log('Index de l\'étape trouvée:', etapeIndex);

    if (etapeIndex === -1) {
      console.log('Étape non trouvée:', req.params.etapeId);
      return res.status(404).json({ error: 'Étape non trouvée' });
    }

    const etape = command.etapesProduction[etapeIndex];
    console.log('Étape avant modification:', {
      nom: etape.nom,
      statut: etape.statut,
      nouveauStatut: status
    });

    // Vérification des permissions (optionnel - commenté pour le moment)
    // if (etape.responsable?.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier cette étape.' });
    // }
    
    // Logique de mise à jour
    etape.statut = status;
    if (status === 'in-progress' && !etape.dateDebut) {
      etape.dateDebut = new Date();
    } else if (status === 'completed') {
      etape.dateFin = new Date();
      
      // Activer l'étape suivante si elle existe
      if (etapeIndex < command.etapesProduction.length - 1) {
        if (command.etapesProduction[etapeIndex + 1].statut === 'pending') {
          command.etapesProduction[etapeIndex + 1].statut = 'in-progress';
          command.etapesProduction[etapeIndex + 1].dateDebut = new Date();
        }
      }
    }
    
    // Mettre à jour la progression globale de la commande
    const completedSteps = command.etapesProduction.filter(e => e.statut === 'completed').length;
    command.progression = Math.round((completedSteps / command.etapesProduction.length) * 100);

    console.log('Progression mise à jour:', command.progression);

    await command.save();
    console.log('Commande sauvegardée avec succès');

    // Enregistrer l'historique
    const historyEntry = new History({
      user: req.user.userId,
      action: 'UPDATE_STEP_STATUS',
      entity: 'Command',
      entityId: command._id,
      changes: {
        message: `Le statut de l'étape "${etape.nom}" a été mis à jour vers "${status}".`,
        stepId: etape._id,
        previousStatus: etape.statut,
        newStatus: status,
      }
    });
    await historyEntry.save();

    const updatedCommand = await Command.findById(command._id)
      .populate('etapesProduction.responsable', 'nom')
      .populate('clientId');

    console.log('Commande mise à jour renvoyée');
    
    // Émettre l'événement de mise à jour d'étape pour la synchronisation en temps réel
    emitStepUpdated(command._id, req.params.etapeId, { 
      etapesProduction: updatedCommand.etapesProduction 
    });
    
    // Émettre l'événement de mise à jour complète de commande pour les barres de progression
    emitCommandFullyUpdated(updatedCommand);
    
    res.json(updatedCommand);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de l\'étape:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/commands/:id/etapes/:etapeId/complete - Marquer une étape comme terminée
router.patch('/:id/etapes/:etapeId/complete', async (req, res) => {
  try {
    const command = await Command.findOne({
      _id: req.params.id,
      organisation: req.user.organisationId,
    });

    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const etapeIndex = command.etapesProduction.findIndex(e => e._id.toString() === req.params.etapeId);

    if (etapeIndex === -1) {
      return res.status(404).json({ error: 'Étape non trouvée' });
    }

    // Vérifier si l'étape est bien "en cours"
    if (command.etapesProduction[etapeIndex].statut !== 'in-progress') {
      return res.status(400).json({ error: `L'étape ne peut être terminée que si elle est "en cours". Statut actuel: ${command.etapesProduction[etapeIndex].statut}` });
    }

    // Mettre à jour l'étape actuelle
    command.etapesProduction[etapeIndex].statut = 'completed';
    command.etapesProduction[etapeIndex].dateFin = new Date();

    // Passer à l'étape suivante si elle existe
    if (etapeIndex < command.etapesProduction.length - 1) {
      command.etapesProduction[etapeIndex + 1].statut = 'in-progress';
      command.etapesProduction[etapeIndex + 1].dateDebut = new Date();
    }
    
    // Mettre à jour la progression
    const completedSteps = command.etapesProduction.filter(e => e.statut === 'completed').length;
    command.progression = Math.round((completedSteps / command.etapesProduction.length) * 100);

    await command.save();

    // Enregistrer l'historique
    const historyEntry = new History({
      user: req.user.userId,
      action: 'COMPLETE_STEP',
      entity: 'Command',
      entityId: command._id,
      changes: {
        message: `L'étape "${command.etapesProduction[etapeIndex].nom}" a été terminée.`,
        stepId: command.etapesProduction[etapeIndex]._id,
        completedAt: new Date(),
      }
    });
    await historyEntry.save();

    const updatedCommand = await Command.findById(command._id)
      .populate('etapesProduction.responsable', 'nom')
      .populate('clientId');

    // Émettre l'événement de mise à jour d'étape pour la synchronisation en temps réel
    emitStepUpdated(command._id, req.params.etapeId, { 
      etapesProduction: updatedCommand.etapesProduction 
    });

    // Émettre l'événement de mise à jour complète de commande pour les barres de progression
    emitCommandFullyUpdated(updatedCommand);

    res.json(updatedCommand);
  } catch (error) {
    console.error('Erreur lors de la validation de l\'étape:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;