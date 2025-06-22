import mongoose from 'mongoose';

const organisationSchema = new mongoose.Schema({
  nom: { 
    type: String, 
    required: true,
    trim: true,
  },
  membres: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, { timestamps: true });

organisationSchema.index({ nom: 1 });

export default mongoose.model('Organisation', organisationSchema);
