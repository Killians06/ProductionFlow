import mongoose from 'mongoose';

const actionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  organisation: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisation' },
  type: { type: String, required: true }, // ex: 'update_client', 'create_command', 'delete_production'
  cible: { type: String }, // id ou nom de l'entité modifiée
  details: { type: Object }, // infos additionnelles
  date: { type: Date, default: Date.now }
});

export default mongoose.model('ActionLog', actionLogSchema);
