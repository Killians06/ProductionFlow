import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import commandRoutes from './routes/commands.js';
import statsRoutes from './routes/stats.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import clientRoutes from './routes/clients.js';
import invitationRoutes from './routes/invitations.js';
import organisationRoutes from './routes/organisation.js';
import protect from './middleware/auth.js';
import { setIO } from './utils/socketEvents.js';

dotenv.config();

// Vérifier que JWT_SECRET est défini
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET non défini, utilisation d\'une valeur par défaut (INSÉCURISÉ)');
  process.env.JWT_SECRET = 'default-secret-key-change-in-production';
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000", 
      "http://192.168.1.98:5173",
      "http://77.129.48.8:5173",
      "http://77.129.48.8:3000"
    ],
    methods: ["GET", "POST"]
  }
});

// Initialiser Socket.IO dans l'utilitaire
setIO(io);

const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Nouveau client connecté:', socket.id);

  // Authentifier le socket et récupérer l'organisation
  socket.on('authenticate', async (data) => {
    try {
      console.log('🔐 Tentative d\'authentification socket pour:', socket.id);
      const { token } = data;
      if (!token) {
        console.log('❌ Token manquant pour socket:', socket.id);
        socket.emit('auth_error', { message: 'Token manquant' });
        return;
      }

      console.log('🔐 Token reçu, longueur:', token.length);
      
      // Vérifier le token et récupérer l'utilisateur
      console.log('🔐 Vérification du token avec JWT_SECRET...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔐 Token décodé, userId:', decoded.userId);
      
      // Récupérer l'utilisateur avec son organisation
      const User = (await import('./models/User.js')).default;
      const user = await User.findById(decoded.userId).populate('organisation');
      
      if (!user) {
        console.log('❌ Utilisateur non trouvé pour userId:', decoded.userId);
        socket.emit('auth_error', { message: 'Utilisateur non trouvé' });
        return;
      }
      
      if (!user.organisation) {
        console.log('❌ Organisation non trouvée pour utilisateur:', user.email);
        socket.emit('auth_error', { message: 'Organisation non trouvée' });
        return;
      }

      console.log('✅ Utilisateur et organisation trouvés:', user.email, '->', user.organisation.nom);

      // Stocker les informations de l'utilisateur dans le socket
      socket.userId = user._id;
      socket.organisationId = user.organisation._id;
      socket.organisationName = user.organisation.nom;

      // Rejoindre la room spécifique à l'organisation
      const organisationRoom = `organisation_${user.organisation._id}`;
      socket.join(organisationRoom);
      
      console.log(`🔌 Client ${socket.id} authentifié et rejoint la room ${organisationRoom} (${user.organisation.nom})`);
      
      socket.emit('authenticated', { 
        message: 'Authentifié avec succès',
        organisation: user.organisation.nom
      });

    } catch (error) {
      console.error('❌ Erreur détaillée d\'authentification socket:', error);
      console.error('❌ Stack trace:', error.stack);
      socket.emit('auth_error', { message: 'Erreur d\'authentification: ' + error.message });
    }
  });

  // Connexion publique pour les pages mobiles (sans authentification)
  socket.on('join_public', async (data) => {
    try {
      const { commandId } = data;
      if (!commandId) {
        socket.emit('public_error', { message: 'CommandId manquant' });
        return;
      }

      console.log('📱 Page mobile publique connectée pour commande:', commandId);
      
      // Rejoindre une room publique pour cette commande
      const publicRoom = `public_command_${commandId}`;
      socket.join(publicRoom);
      
      // Stocker l'info pour les logs
      socket.publicCommandId = commandId;
      
      console.log(`📱 Client public ${socket.id} rejoint la room ${publicRoom}`);
      
      socket.emit('public_joined', { 
        message: 'Connecté en mode public',
        commandId: commandId
      });

    } catch (error) {
      console.error('❌ Erreur connexion publique:', error);
      socket.emit('public_error', { message: 'Erreur de connexion publique' });
    }
  });

  // Écouter les événements de la page mobile (seulement si authentifié)
  socket.on('STATUS_CHANGED', (data) => {
    if (!socket.organisationId) {
      console.log('⚠️ Tentative d\'émission sans authentification:', socket.id);
      return;
    }
    
    console.log(`📱 Événement STATUS_CHANGED reçu de ${socket.organisationName}:`, data);
    // Diffuser l'événement uniquement aux clients de la même organisation
    const organisationRoom = `organisation_${socket.organisationId}`;
    socket.to(organisationRoom).emit('STATUS_CHANGED', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client déconnecté: ${socket.id} (${socket.organisationName || socket.publicCommandId || 'non authentifié'})`);
  });
});

// Fonction utilitaire pour émettre des événements de mise à jour
export const emitCommandUpdate = (eventType, data) => {
  console.log(`📡 Émission événement ${eventType}:`, data);
  io.to('commands').emit(eventType, data);
};

// Routes
// Routes publiques
app.use('/api/auth', authRoutes);

// Route publique pour mise à jour rapide du statut
app.put('/api/commands/:id/quick-status', async (req, res) => {
  try {
    const { statut, progression = 0, notifyClient = false } = req.body;
    
    console.log('Mise à jour rapide statut:', { 
      commandId: req.params.id, 
      statut, 
      progression, 
      notifyClient 
    });
    
    if (!statut) {
      return res.status(400).json({ error: 'Statut requis' });
    }

    // Chercher la commande dans toutes les organisations par commandId ou _id
    const Organisation = (await import('./models/Organisation.js')).default;
    let organisation = null;
    let command = null;
    let commandIndex = -1;

    // D'abord essayer de trouver par commandId (nouvelle structure)
    const organisations = await Organisation.find({
      'commandes.commandId': parseInt(req.params.id)
    }).populate('commandes.etapesProduction.responsable', 'nom')
      .populate('commandes.clientId');

    if (organisations.length > 0) {
      organisation = organisations[0];
      commandIndex = organisation.commandes.findIndex(cmd => cmd.commandId === parseInt(req.params.id));
      if (commandIndex !== -1) {
        command = organisation.commandes[commandIndex];
      }
    }

    // Si pas trouvé par commandId, essayer par _id (ancienne structure)
    if (!command) {
      const organisationsById = await Organisation.find({
        'commandes._id': req.params.id
      }).populate('commandes.etapesProduction.responsable', 'nom')
        .populate('commandes.clientId');

      if (organisationsById.length > 0) {
        organisation = organisationsById[0];
        commandIndex = organisation.commandes.findIndex(cmd => cmd._id.toString() === req.params.id);
        if (commandIndex !== -1) {
          command = organisation.commandes[commandIndex];
        }
      }
    }

    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const previousStatus = command.statut;
    console.log('Ancien statut:', previousStatus);

    // Recalculer la progression comme dans la route web
    let newProgression = progression;
    if (["ready", "shipped", "delivered"].includes(statut)) {
      newProgression = 100;
    } else {
      // Recalculer la progression selon les étapes terminées
      if (command.etapesProduction && command.etapesProduction.length > 0) {
        const completedSteps = command.etapesProduction.filter(e => e.statut === 'completed').length;
        newProgression = Math.round((completedSteps / command.etapesProduction.length) * 100);
      } else {
        newProgression = 0;
      }
    }

    // Mettre à jour la commande dans l'organisation
    organisation.commandes[commandIndex].statut = statut;
    organisation.commandes[commandIndex].progression = newProgression;
    organisation.commandes[commandIndex].lastModifiedBy = 'mobile-operator';
    organisation.commandes[commandIndex].lastModifiedAt = new Date();

    await organisation.save();

    const updatedCommand = organisation.commandes[commandIndex];
    console.log('Commande mise à jour:', updatedCommand.numero);

    // Envoyer un email au client si demandé
    let emailSent = false;
    if (notifyClient) {
      try {
        if (updatedCommand.clientId && updatedCommand.clientId.email) {
          console.log('Tentative d\'envoi d\'email à:', updatedCommand.clientId.email);
          const sendStatusUpdateMail = (await import('./utils/sendStatusUpdateMail.js')).default;
          await sendStatusUpdateMail(updatedCommand, statut);
          console.log(`Email de notification envoyé au client ${updatedCommand.clientId.email} pour la commande ${updatedCommand.numero}`);
          emailSent = true;
        } else {
          console.log('Aucun email à envoyer - client sans email');
        }
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de l\'email (non critique):', emailError.message);
      }
    } else {
      console.log('Aucun email demandé');
    }

    // Créer une entrée dans l'historique (après l'envoi du mail)
    try {
      const History = (await import('./models/History.js')).default;
      const historyEntry = new History({
        user: null,
        action: 'UPDATE_STATUS',
        entity: 'Command',
        entityId: updatedCommand._id,
        changes: {
          previousStatus: previousStatus,
          newStatus: statut,
          progression: newProgression
        },
        source: 'mobile',
        timestamp: new Date(),
        mailSent: emailSent,
      });
      await historyEntry.save();
      console.log('Historique créé avec succès');
    } catch (historyError) {
      console.log('Erreur lors de la création de l\'historique (non critique):', historyError.message);
    }

    console.log('Envoi de la réponse au client');
    
    // Émettre l'événement Socket.IO pour la synchronisation en temps réel
    console.log('[SOCKET][COMMAND_FULLY_UPDATED][QUICK] CommandId:', updatedCommand._id, '| Statut:', statut, '| Progression envoyée:', updatedCommand.progression);
    
    const { emitCommandFullyUpdated } = await import('./utils/socketEvents.js');
    emitCommandFullyUpdated(updatedCommand, organisation._id);
    
    res.json({ 
      success: true, 
      message: 'Statut mis à jour avec succès',
      emailSent: emailSent,
      command: {
        _id: updatedCommand._id,
        commandId: updatedCommand.commandId,
        numero: updatedCommand.numero,
        statut: updatedCommand.statut,
        progression: updatedCommand.progression
      }
    });
  } catch (error) {
    console.error('Erreur mise à jour rapide statut:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du statut',
      details: error.message 
    });
  }
});

// Route publique pour récupérer les détails d'une commande (pour la page mobile)
app.get('/api/commands/:id/quick-view', async (req, res) => {
  try {
    // Chercher la commande dans toutes les organisations par commandId ou _id
    const Organisation = (await import('./models/Organisation.js')).default;
    let command = null;

    // D'abord essayer de trouver par commandId (nouvelle structure)
    const organisations = await Organisation.find({
      'commandes.commandId': parseInt(req.params.id)
    }).populate('commandes.etapesProduction.responsable', 'nom')
      .populate('commandes.clientId');

    if (organisations.length > 0) {
      command = organisations[0].commandes.find(cmd => cmd.commandId === parseInt(req.params.id));
    }

    // Si pas trouvé par commandId, essayer par _id (ancienne structure)
    if (!command) {
      const organisationsById = await Organisation.find({
        'commandes._id': req.params.id
      }).populate('commandes.etapesProduction.responsable', 'nom')
        .populate('commandes.clientId');

      if (organisationsById.length > 0) {
        command = organisationsById[0].commandes.find(cmd => cmd._id.toString() === req.params.id);
      }
    }

    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    res.json(command);
  } catch (error) {
    console.error('Erreur récupération commande:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération de la commande' });
  }
});

// Routes protégées
app.use('/api/commands', protect, commandRoutes);
app.use('/api/stats', protect, statsRoutes);
app.use('/api/users', protect, userRoutes);
app.use('/api/clients', protect, clientRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/organisation', protect, organisationRoutes);

// MongoDB Connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI n\'est pas défini dans le fichier .env');
      console.log('📝 Veuillez créer un fichier .env avec votre chaîne de connexion MongoDB Atlas');
      console.log('   Format: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/production-tracking');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB Atlas');
  } catch (error) {
    console.error('❌ Erreur de connexion à MongoDB:', error.message);
    console.log('💡 Vérifiez votre chaîne de connexion MongoDB Atlas dans le fichier .env');
    process.exit(1);
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'API de suivi de production fonctionnelle',
    database: mongoose.connection.readyState === 1 ? 'Connectée' : 'Déconnectée'
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: "Bienvenue sur l'API ProductionFlow 🚀",
    endpoints: [
      '/api/health',
      '/api/commands',
      '/api/clients',
      '/api/stats',
      '/api/users',
      '/api/organisation',
      '/api/invitations',
      '/api/auth',
      '/api/commands/:id/quick-status',
      '/api/commands/:id/quick-view',
    ]
  });
});

// Start server
const startServer = async () => {
  await connectDB();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
    console.log(`🌐 API accessible sur le réseau local: http://192.168.1.98:${PORT}/api`);
  });
};

startServer();