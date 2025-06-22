import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'CREATE_COMMAND',
      'UPDATE_COMMAND',
      'UPDATE_STATUS',
      'DELETE_COMMAND',
      'ASSIGN_STEP',
      'UPDATE_STEP_STATUS',
      'COMPLETE_STEP',
      // Ajoutez d'autres actions au besoin
    ],
  },
  entity: {
    type: String,
    required: true,
    enum: ['Command', 'User'],
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  changes: {
    type: mongoose.Schema.Types.Mixed, // Pour stocker les détails des changements
  },
  source: {
    type: String,
    enum: ['web', 'mobile'],
    default: 'web'
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const History = mongoose.model('History', historySchema);

export default History; 