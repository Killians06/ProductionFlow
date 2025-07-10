// Utilitaire pour émettre des événements Socket.IO
// Ce fichier sera importé dans les routes pour émettre des événements de synchronisation

let io = null;

export const setIO = (socketIO) => {
  io = socketIO;
};

export const emitCommandUpdate = (eventType, data, organisationId) => {
  if (io) {
    const organisationRoom = `organisation_${organisationId}`;
    console.log(`📡 [${eventType}] Émission vers ${organisationRoom}:`, {
      data,
      organisationId,
      timestamp: new Date().toISOString(),
      rooms: io.sockets.adapter.rooms.get(organisationRoom)?.size || 0
    });
    io.to(organisationRoom).emit(eventType, data);
    
    // Émettre aussi vers les rooms publiques si on a un commandId
    if (data.commandId || (data.command && (data.command._id || data.command.commandId))) {
      const commandId = data.commandId || data.command._id || data.command.commandId;
      const publicRoom = `public_command_${commandId}`;
      console.log(`📡 [${eventType}] Émission vers room publique ${publicRoom}:`, {
        commandId,
        timestamp: new Date().toISOString(),
        rooms: io.sockets.adapter.rooms.get(publicRoom)?.size || 0
      });
      io.to(publicRoom).emit(eventType, data);
    }
  } else {
    console.warn('⚠️ Socket.IO non initialisé');
  }
};

export const emitCommandCreated = (command, organisationId) => {
  emitCommandUpdate('COMMAND_CREATED', { command }, organisationId);
};

export const emitCommandUpdated = (commandId, updates, organisationId) => {
  emitCommandUpdate('COMMAND_UPDATED', { commandId, updates }, organisationId);
};

export const emitCommandDeleted = (commandId, organisationId) => {
  emitCommandUpdate('COMMAND_DELETED', { commandId }, organisationId);
};

export const emitStatusChanged = (commandId, newStatus, progression, organisationId) => {
  emitCommandUpdate('STATUS_CHANGED', { commandId, newStatus, progression }, organisationId);
};

export const emitStepUpdated = (commandId, stepId, updates, organisationId) => {
  console.log('📡 [STEP_UPDATED] Émission événement:', {
    commandId,
    stepId,
    updates,
    organisationId,
    timestamp: new Date().toISOString()
  });
  emitCommandUpdate('STEP_UPDATED', { commandId, stepId, updates }, organisationId);
};

export const emitCommandFullyUpdated = (command, organisationId) => {
  console.log('📡 Émission COMMAND_FULLY_UPDATED avec progression:', command.progression);
  console.log('📡 Nombre d\'étapes:', command.etapesProduction?.length);
  emitCommandUpdate('COMMAND_FULLY_UPDATED', { command }, organisationId);
}; 