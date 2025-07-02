import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
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
import Command from './models/Command.js';
import { setIO } from './utils/socketEvents.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000", "http://192.168.1.98:5173"],
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

  // Rejoindre la room générale pour les mises à jour de commandes
  socket.join('commands');

  // Écouter les événements de la page mobile
  socket.on('STATUS_CHANGED', (data) => {
    console.log('📱 Événement STATUS_CHANGED reçu de la page mobile:', data);
    // Diffuser l'événement à tous les autres clients
    socket.to('commands').emit('STATUS_CHANGED', data);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client déconnecté:', socket.id);
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

    // Récupérer la commande actuelle pour avoir l'ancien statut
    const currentCommand = await Command.findById(req.params.id);
    if (!currentCommand) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const previousStatus = currentCommand.statut;
    console.log('Ancien statut:', previousStatus);

    // Recalculer la progression comme dans la route web
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

    // Mise à jour simple de la commande
    const command = await Command.findByIdAndUpdate(
      req.params.id,
      { 
        statut, 
        progression: newProgression,
        lastModifiedBy: 'mobile-operator',
        lastModifiedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!command) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    console.log('Commande mise à jour:', command.numero);

    // Envoyer un email au client si demandé
    let emailSent = false;
    if (notifyClient) {
      try {
        // Re-populer la commande pour avoir les informations client
        const populatedCommand = await Command.findById(command._id).populate('clientId');
        if (populatedCommand && populatedCommand.clientId && populatedCommand.clientId.email) {
          console.log('Tentative d\'envoi d\'email à:', populatedCommand.clientId.email);
          const sendStatusUpdateMail = (await import('./utils/sendStatusUpdateMail.js')).default;
          await sendStatusUpdateMail(populatedCommand, statut);
          console.log(`Email de notification envoyé au client ${populatedCommand.clientId.email} pour la commande ${populatedCommand.numero}`);
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
        entityId: command._id,
        changes: {
          previousStatus: previousStatus,
          newStatus: statut,
          progression: progression
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
    console.log('[SOCKET][STATUS_CHANGED][QUICK] CommandId:', command._id, '| Statut:', statut, '| Progression envoyée:', command.progression);
    emitCommandUpdate('STATUS_CHANGED', {
      commandId: command._id,
      newStatus: statut,
      progression: command.progression
    });
    
    res.json({ 
      success: true, 
      message: 'Statut mis à jour avec succès',
      emailSent: emailSent,
      command: {
        _id: command._id,
        numero: command.numero,
        statut: command.statut,
        progression: command.progression
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
    const command = await Command.findById(req.params.id)
      .populate('clientId')
      .populate('etapesProduction.responsable', 'nom');

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