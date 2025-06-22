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
  numero: { type: String, required: true, unique: true },
  client: {
    nom: { type: String, required: true },
    email: { type: String, required: true }
  },
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true
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
}, {
  timestamps: true
});

// Index pour améliorer les performances de recherche
commandSchema.index({ numero: 1 });
commandSchema.index({ 'client.nom': 1 });
commandSchema.index({ statut: 1 });
commandSchema.index({ dateLivraison: 1 });

export default mongoose.model('Command', commandSchema);