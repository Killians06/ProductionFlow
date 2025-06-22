// Utilitaire pour émettre des événements Socket.IO
// Ce fichier sera importé dans les routes pour émettre des événements de synchronisation

let io = null;

export const setIO = (socketIO) => {
  io = socketIO;
};

export const emitCommandUpdate = (eventType, data) => {
  if (io) {
    console.log(`📡 Émission événement ${eventType}:`, data);
    io.to('commands').emit(eventType, data);
  } else {
    console.warn('⚠️ Socket.IO non initialisé');
  }
};

export const emitCommandCreated = (command) => {
  emitCommandUpdate('COMMAND_CREATED', { command });
};

export const emitCommandUpdated = (commandId, updates) => {
  emitCommandUpdate('COMMAND_UPDATED', { commandId, updates });
};

export const emitCommandDeleted = (commandId) => {
  emitCommandUpdate('COMMAND_DELETED', { commandId });
};

export const emitStatusChanged = (commandId, newStatus, progression) => {
  emitCommandUpdate('STATUS_CHANGED', { commandId, newStatus, progression });
};

export const emitStepUpdated = (commandId, stepId, updates) => {
  emitCommandUpdate('STEP_UPDATED', { commandId, stepId, updates });
};

export const emitCommandFullyUpdated = (command) => {
  console.log('📡 Émission COMMAND_FULLY_UPDATED avec progression:', command.progression);
  console.log('📡 Nombre d\'étapes:', command.etapesProduction?.length);
  emitCommandUpdate('COMMAND_FULLY_UPDATED', { command });
}; 