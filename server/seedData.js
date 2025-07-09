import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organisation from './models/Organisation.js';
import User from './models/User.js';
import Client from './models/Client.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';

async function seedData() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Nettoyer les collections existantes
    await Organisation.deleteMany({});
    await User.deleteMany({});
    await Client.deleteMany({});
    console.log('🧹 Collections nettoyées');

    // Créer une organisation
    const organisation = new Organisation({
      nom: 'Entreprise Test',
      nextCommandId: 1
    });
    await organisation.save();
    console.log('🏢 Organisation créée:', organisation.nom);

    // Créer des utilisateurs
    const admin = new User({
      nom: 'Admin',
      email: 'admin@test.com',
      password: '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dD3eE4fF5gG6hH7iI8jJ9kK0lL1mM2nN3oO4pP5qQ6rR7sS8tT9uU0vV1wW2xX3yY4zZ',
      organisation: organisation._id,
      role: 'admin'
    });
    await admin.save();

    const user = new User({
      nom: 'Utilisateur',
      email: 'user@test.com',
      password: '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dD3eE4fF5gG6hH7iI8jJ9kK0lL1mM2nN3oO4pP5qQ6rR7sS8tT9uU0vV1wW2xX3yY4zZ',
      organisation: organisation._id,
      role: 'user'
    });
    await user.save();
    console.log('👥 Utilisateurs créés');

    // Créer des clients
    const client1 = new Client({
      nomSociete: 'Client A',
      personneContact: {
        nom: 'Dupont',
        prenom: 'Jean',
        fonction: 'Directeur'
      },
      email: 'jean.dupont@clienta.com',
      telephone: '0123456789',
      adresse: {
        rue: '123 Rue de la Paix',
        codePostal: '75001',
        ville: 'Paris',
        pays: 'France'
      },
      organisation: organisation._id
    });
    await client1.save();

    const client2 = new Client({
      nomSociete: 'Client B',
      personneContact: {
        nom: 'Martin',
        prenom: 'Marie',
        fonction: 'Responsable'
      },
      email: 'marie.martin@clientb.com',
      telephone: '0987654321',
      adresse: {
        rue: '456 Avenue des Champs',
        codePostal: '69001',
        ville: 'Lyon',
        pays: 'France'
      },
      organisation: organisation._id
    });
    await client2.save();
    console.log('🏢 Clients créés');

    // Créer des commandes dans l'organisation
    const commande1 = {
      commandId: 1,
      numero: 'CMD-2024-001',
      client: {
        nom: 'Client A',
        email: 'jean.dupont@clienta.com'
      },
      clientId: client1._id,
      produits: [
        {
          nom: 'Produit A',
          quantite: 10,
          specifications: 'Spécifications du produit A'
        }
      ],
      dateCreation: new Date('2024-01-15'),
      dateLivraison: new Date('2024-02-15'),
      statut: 'in-production',
      priority: 'high',
      notes: 'Commande urgente',
      progression: 60,
      etapesProduction: [
        {
          nom: 'Fabrication',
          statut: 'completed',
          responsable: user._id,
          dateDebut: new Date('2024-01-16'),
          dateFin: new Date('2024-01-20')
        },
        {
          nom: 'Contrôle qualité',
          statut: 'in-progress',
          responsable: admin._id,
          dateDebut: new Date('2024-01-21')
        }
      ]
    };

    const commande2 = {
      commandId: 2,
      numero: 'CMD-2024-002',
      client: {
        nom: 'Client B',
        email: 'marie.martin@clientb.com'
      },
      clientId: client2._id,
      produits: [
        {
          nom: 'Produit B',
          quantite: 5,
          specifications: 'Spécifications du produit B'
        },
        {
          nom: 'Produit C',
          quantite: 3,
          specifications: 'Spécifications du produit C'
        }
      ],
      dateCreation: new Date('2024-01-20'),
      dateLivraison: new Date('2024-03-01'),
      statut: 'validated',
      priority: 'medium',
      notes: 'Commande standard',
      progression: 20,
      etapesProduction: [
        {
          nom: 'Planification',
          statut: 'completed',
          responsable: admin._id,
          dateDebut: new Date('2024-01-21'),
          dateFin: new Date('2024-01-22')
        },
        {
          nom: 'Fabrication',
          statut: 'pending',
          responsable: user._id
        }
      ]
    };

    // Ajouter les commandes à l'organisation
    organisation.commandes.push(commande1, commande2);
    organisation.nextCommandId = 3;
    await organisation.save();
    console.log('📦 Commandes créées');

    console.log('🎉 Données de test créées avec succès !');
    console.log('📊 Résumé:');
    console.log(`   - 1 organisation: ${organisation.nom}`);
    console.log(`   - 2 utilisateurs: ${admin.email}, ${user.email}`);
    console.log(`   - 2 clients: ${client1.nomSociete}, ${client2.nomSociete}`);
    console.log(`   - 2 commandes: ${commande1.numero}, ${commande2.numero}`);

  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

seedData();