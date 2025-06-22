import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Command from './models/Command.js';
import User from './models/User.js';

dotenv.config();

const seedData = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI n\'est pas défini dans le fichier .env');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB Atlas');

    // Nettoyer les données existantes
    await Command.deleteMany({});
    await User.deleteMany({});
    console.log('🧹 Données existantes supprimées');

    // Créer des utilisateurs de test
    const users = [
      {
        nom: 'Jean Dupont',
        email: 'jean.dupont@example.com',
        role: 'user'
      },
      {
        nom: 'Marie Martin',
        email: 'marie.martin@example.com',
        role: 'user'
      },
      {
        nom: 'Pierre Durand',
        email: 'pierre.durand@example.com',
        role: 'user'
      },
      {
        nom: 'Sophie Blanc',
        email: 'sophie.blanc@example.com',
        role: 'user'
      },
      {
        nom: 'Luc Moreau',
        email: 'luc.moreau@example.com',
        role: 'user'
      },
      {
        nom: 'Anne Rousseau',
        email: 'anne.rousseau@example.com',
        role: 'user'
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ ${createdUsers.length} utilisateurs créés`);

    // Créer un map pour accéder facilement aux utilisateurs par nom
    const userMap = {};
    createdUsers.forEach(user => {
      userMap[user.nom] = user._id;
    });

    // Créer les commandes de démonstration
    const commands = [
      {
        numero: 'CMD-2024-001',
        client: {
          nom: 'Société ABC',
          email: 'contact@abc.com',
        },
        produits: [
          {
            nom: 'Pièce métallique type A',
            quantite: 150,
            specifications: 'Acier inoxydable, traitement de surface',
          },
          {
            nom: 'Support plastique',
            quantite: 75,
          },
        ],
        dateCreation: new Date('2024-01-15'),
        dateLivraison: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Dans 5 jours
        statut: 'in-production',
        priority: 'high',
        progression: 65,
        etapesProduction: [
          {
            nom: 'Préparation matières',
            description: 'Préparation et vérification des matières premières',
            dateDebut: new Date('2024-01-16'),
            dateFin: new Date('2024-01-17'),
            statut: 'completed',
            responsable: userMap['Jean Dupont'],
            dureeEstimee: 8,
            dureeReelle: 7,
          },
          {
            nom: 'Usinage',
            description: 'Usinage des pièces métalliques',
            dateDebut: new Date('2024-01-18'),
            statut: 'in-progress',
            responsable: userMap['Marie Martin'],
            dureeEstimee: 16,
          },
          {
            nom: 'Contrôle qualité',
            description: 'Vérification des dimensions et finitions',
            statut: 'pending',
            responsable: userMap['Pierre Durand'],
            dureeEstimee: 4,
          },
          {
            nom: 'Emballage',
            description: 'Emballage et préparation expédition',
            statut: 'pending',
            dureeEstimee: 2,
          },
        ],
      },
      {
        numero: 'CMD-2024-002',
        client: {
          nom: 'Entreprise XYZ',
          email: 'commandes@xyz.fr',
        },
        produits: [
          {
            nom: 'Assemblage électronique',
            quantite: 50,
            specifications: 'Assemblage PCB avec boîtier',
          },
        ],
        dateCreation: new Date('2024-01-18'),
        dateLivraison: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), // Dans 12 jours
        statut: 'validated',
        priority: 'medium',
        progression: 0,
        etapesProduction: [
          {
            nom: 'Approvisionnement composants',
            description: 'Commande et réception des composants électroniques',
            statut: 'pending',
            responsable: userMap['Sophie Blanc'],
            dureeEstimee: 24,
          },
          {
            nom: 'Assemblage PCB',
            description: 'Soudure et assemblage des composants',
            statut: 'pending',
            responsable: userMap['Luc Moreau'],
            dureeEstimee: 12,
          },
          {
            nom: 'Test fonctionnel',
            description: 'Tests et validation du produit fini',
            statut: 'pending',
            responsable: userMap['Anne Rousseau'],
            dureeEstimee: 8,
          },
        ],
      },
      {
        numero: 'CMD-2024-003',
        client: {
          nom: 'Industries DEF',
          email: 'production@def.com',
        },
        produits: [
          {
            nom: 'Prototype machine',
            quantite: 1,
            specifications: 'Prototype complet avec documentation',
          },
        ],
        dateCreation: new Date('2024-01-20'),
        dateLivraison: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Il y a 2 jours (en retard)
        statut: 'quality-check',
        priority: 'high',
        progression: 95,
        etapesProduction: [
          {
            nom: 'Conception détaillée',
            description: 'Plans et spécifications techniques',
            dateDebut: new Date('2024-01-21'),
            dateFin: new Date('2024-01-25'),
            statut: 'completed',
            responsable: userMap['Jean Dupont'],
            dureeEstimee: 32,
            dureeReelle: 30,
          },
          {
            nom: 'Fabrication',
            description: 'Fabrication du prototype',
            dateDebut: new Date('2024-01-26'),
            dateFin: new Date('2024-02-05'),
            statut: 'completed',
            responsable: userMap['Marie Martin'],
            dureeEstimee: 80,
            dureeReelle: 85,
          },
          {
            nom: 'Tests et validation',
            description: 'Tests de fonctionnement et validation finale',
            dateDebut: new Date('2024-02-06'),
            statut: 'in-progress',
            responsable: userMap['Pierre Durand'],
            dureeEstimee: 16,
          },
        ],
      },
      {
        numero: 'CMD-2024-004',
        client: {
          nom: 'TechCorp Solutions',
          email: 'orders@techcorp.com',
        },
        produits: [
          {
            nom: 'Boîtier aluminium',
            quantite: 200,
            specifications: 'Anodisation noire, gravure laser',
          },
        ],
        dateCreation: new Date('2024-01-22'),
        dateLivraison: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        statut: 'delivered',
        priority: 'medium',
        progression: 100,
        etapesProduction: [
          {
            nom: 'Découpe aluminium',
            description: 'Découpe laser des plaques aluminium',
            dateDebut: new Date('2024-01-23'),
            dateFin: new Date('2024-01-24'),
            statut: 'completed',
            responsable: userMap['Sophie Blanc'],
            dureeEstimee: 12,
            dureeReelle: 11,
          },
          {
            nom: 'Pliage et formage',
            description: 'Pliage des boîtiers selon plans',
            dateDebut: new Date('2024-01-25'),
            dateFin: new Date('2024-01-26'),
            statut: 'completed',
            responsable: userMap['Luc Moreau'],
            dureeEstimee: 8,
            dureeReelle: 8,
          },
          {
            nom: 'Anodisation',
            description: 'Traitement de surface anodisation noire',
            dateDebut: new Date('2024-01-27'),
            dateFin: new Date('2024-01-29'),
            statut: 'completed',
            responsable: userMap['Anne Rousseau'],
            dureeEstimee: 16,
            dureeReelle: 18,
          },
          {
            nom: 'Gravure laser',
            description: 'Gravure des marquages et logos',
            dateDebut: new Date('2024-01-30'),
            dateFin: new Date('2024-01-30'),
            statut: 'completed',
            responsable: userMap['Jean Dupont'],
            dureeEstimee: 4,
            dureeReelle: 3,
          },
        ],
      },
    ];

    const createdCommands = await Command.insertMany(commands);
    console.log(`✅ ${createdCommands.length} commandes créées`);

    console.log('🎉 Données de démonstration créées avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error);
    process.exit(1);
  }
};

seedData();