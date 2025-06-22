import mongoose from 'mongoose';
import crypto from 'crypto';

const invitationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organisation',
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expires: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted'],
    default: 'pending',
  }
}, { timestamps: true });

// Avant de sauvegarder, on génère un token si besoin
invitationSchema.pre('validate', function(next) {
  if (this.isNew) {
    this.token = crypto.randomBytes(32).toString('hex');
    // L'invitation expire dans 7 jours
    this.expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

export default mongoose.model('Invitation', invitationSchema); 