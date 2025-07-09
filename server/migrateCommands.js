import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Organisation from './models/Organisation.js';

// Charger les variables d'environnement
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateCommands() {
  try {
    console.log('🔗 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer toutes les organisations
    const organisations = await Organisation.find({});
    console.log(`📋 ${organisations.length} organisations trouvées`);

    // Créer un mapping des organisations par ID pour un accès rapide
    const organisationMap = new Map();
    organisations.forEach(org => {
      organisationMap.set(org._id.toString(), org);
    });

    // Récupérer toutes les commandes de l'ancienne collection
    const oldCommandsCollection = mongoose.connection.db.collection('commands');
    const oldCommands = await oldCommandsCollection.find({}).toArray();
    console.log(`📦 ${oldCommands.length} commandes à migrer`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const oldCommand of oldCommands) {
      try {
        const organisationId = oldCommand.organisation;
        
        if (!organisationId) {
          console.log(`⚠️  Commande ${oldCommand.numero} sans organisation, ignorée`);
          skippedCount++;
          continue;
        }

        const organisation = organisationMap.get(organisationId.toString());
        if (!organisation) {
          console.log(`⚠️  Organisation ${organisationId} non trouvée pour la commande ${oldCommand.numero}, ignorée`);
          skippedCount++;
          continue;
        }

        // Vérifier si la commande existe déjà dans l'organisation
        const existingCommand = organisation.commandes.find(cmd => 
          cmd.numero === oldCommand.numero
        );

        if (existingCommand) {
          console.log(`⚠️  Commande ${oldCommand.numero} déjà présente dans l'organisation ${organisation.nom}, ignorée`);
          skippedCount++;
          continue;
        }

        // Préparer la nouvelle commande
        const newCommand = {
          commandId: organisation.nextCommandId,
          numero: oldCommand.numero,
          client: oldCommand.client,
          clientId: oldCommand.clientId,
          produits: oldCommand.produits || [],
          dateCreation: oldCommand.dateCreation || new Date(),
          dateLivraison: oldCommand.dateLivraison,
          statut: oldCommand.statut || 'draft',
          priority: oldCommand.priority || 'medium',
          notes: oldCommand.notes,
          progression: oldCommand.progression || 0,
          etapesProduction: oldCommand.etapesProduction || [],
          assignedTo: oldCommand.assignedTo
        };

        // Ajouter la commande à l'organisation
        organisation.commandes.push(newCommand);
        organisation.nextCommandId = organisation.nextCommandId + 1;

        // Sauvegarder l'organisation
        await organisation.save();

        console.log(`✅ Commande ${oldCommand.numero} migrée vers l'organisation ${organisation.nom} (ID: ${newCommand.commandId})`);
        migratedCount++;

      } catch (error) {
        console.error(`❌ Erreur lors de la migration de la commande ${oldCommand.numero}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Résumé de la migration:');
    console.log(`✅ Commandes migrées: ${migratedCount}`);
    console.log(`⚠️  Commandes ignorées: ${skippedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`📦 Total traité: ${oldCommands.length}`);

    // Optionnel : supprimer l'ancienne collection après migration réussie
    if (migratedCount > 0 && errorCount === 0) {
      console.log('\n🗑️  Suppression de l\'ancienne collection commands...');
      await oldCommandsCollection.drop();
      console.log('✅ Ancienne collection supprimée');
    }

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB');
  }
}

// Exécuter la migration
migrateCommands().then(() => {
  console.log('🎉 Migration terminée');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 