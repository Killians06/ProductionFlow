import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true,
  },
  nom: { 
    type: String, 
    required: true,
    trim: true,
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  organisation: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organisation',
    required: true,
  },
  role: { 
    type: String, 
    enum: ['admin', 'manager', 'user'], 
    default: 'user' 
  }
}, { timestamps: true });

userSchema.index({ email: 1 });
userSchema.index({ organisation: 1 });

export default mongoose.model('User', userSchema);
