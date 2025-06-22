import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  nomSociete: {
    type: String,
    required: true,
    trim: true
  },
  personneContact: {
    nom: { type: String, required: true, trim: true },
    prenom: { type: String, required: true, trim: true },
    fonction: { type: String, trim: true }
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  telephone: {
    type: String,
    trim: true
  },
  adresse: {
    rue: { type: String, trim: true },
    codePostal: { type: String, trim: true },
    ville: { type: String, trim: true },
    pays: { type: String, trim: true, default: 'France' }
  },
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  actif: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
clientSchema.index({ nomSociete: 1 });
clientSchema.index({ email: 1 });
clientSchema.index({ organisation: 1 });
clientSchema.index({ actif: 1 });

export default mongoose.model('Client', clientSchema); 