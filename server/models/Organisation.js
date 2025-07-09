import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  quantite: { type: Number, required: true },
  specifications: String
});

const productionStepSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  statut: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'blocked'],
    default: 'pending'
  },
  responsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dateDebut: Date,
  dateFin: Date
});

const commandSchema = new mongoose.Schema({
  commandId: { type: Number, required: true }, // ID relatif à l'organisation
  numero: { type: String, required: true }, // Format: CMD-YYYY-NNN
  client: {
    nom: { type: String, required: true },
    email: { type: String, required: true }
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  produits: [productSchema],
  dateCreation: { type: Date, default: Date.now },
  dateLivraison: { type: Date, required: true },
  statut: {
    type: String,
    enum: ['draft', 'pending', 'validated', 'in-production', 'quality-check', 'ready', 'shipped', 'delivered', 'canceled'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  notes: String,
  progression: { type: Number, default: 0, min: 0, max: 100 },
  etapesProduction: [productionStepSchema],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const organisationSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true,
    trim: true,
  },
  membres: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  commandes: [commandSchema],
  nextCommandId: { type: Number, default: 1 } // Pour générer les IDs relatifs
}, { timestamps: true });

organisationSchema.index({ nom: 1 });
organisationSchema.index({ 'commandes.commandId': 1 });
organisationSchema.index({ 'commandes.numero': 1 });

export default mongoose.model('Organisation', organisationSchema);
