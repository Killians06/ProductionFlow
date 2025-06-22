# Synchronisation en Temps Réel

## Vue d'ensemble

L'application utilise Socket.IO pour synchroniser les modifications de commandes en temps réel entre différents ordinateurs/terminaux utilisant l'application simultanément.

## Architecture

### Côté Serveur
- **Socket.IO Server** : Gère les connexions WebSocket
- **Événements émis** : Lors de modifications de commandes via l'API REST
- **Room 'commands'** : Tous les clients connectés reçoivent les mises à jour

### Côté Client
- **Socket.IO Client** : Se connecte au serveur et écoute les événements
- **Hook useSocketSync** : Gère la synchronisation dans le contexte React
- **Mise à jour automatique** : Le state React se met à jour automatiquement

## Événements Socket.IO

### Événements émis par le serveur :
- `COMMAND_CREATED` : Nouvelle commande créée
- `COMMAND_UPDATED` : Commande mise à jour
- `COMMAND_DELETED` : Commande supprimée
- `STATUS_CHANGED` : Statut de commande modifié
- `STEP_UPDATED` : Étape de production mise à jour

### Format des données :
```javascript
// COMMAND_CREATED
{ command: Command }

// COMMAND_UPDATED
{ commandId: string, updates: Partial<Command> }

// COMMAND_DELETED
{ commandId: string }

// STATUS_CHANGED
{ commandId: string, newStatus: string, progression: number }

// STEP_UPDATED
{ commandId: string, stepId: string, updates: any }
```

## Configuration

### Variables d'environnement
```bash
# URL du serveur Socket.IO (optionnel, par défaut: http://localhost:5001)
VITE_SOCKET_URL=http://votre-serveur:5001
```

### CORS
Le serveur est configuré pour accepter les connexions depuis :
- `http://localhost:5173` (développement Vite)
- `http://localhost:3000` (développement alternatif)
- `http://192.168.1.98:5173` (réseau local)

## Utilisation

### Démarrage du serveur
```bash
# Démarrer le serveur Node.js avec Socket.IO
npm run dev:server
```

### Démarrage du client
```bash
# Démarrer l'application React
npm run dev
```

### Test de la synchronisation
1. Ouvrir l'application sur deux ordinateurs différents
2. Se connecter avec le même compte utilisateur
3. Modifier une commande sur l'un des ordinateurs
4. Vérifier que la modification apparaît automatiquement sur l'autre

## Fonctionnalités synchronisées

- ✅ Création de nouvelles commandes
- ✅ Modification des détails de commande
- ✅ Suppression de commandes
- ✅ Changement de statut de commande
- ✅ Mise à jour des étapes de production
- ✅ Assignation de responsables aux étapes
- ✅ Validation/complétion d'étapes

## Dépannage

### Problèmes de connexion
1. Vérifier que le serveur Socket.IO est démarré
2. Vérifier les paramètres CORS
3. Vérifier l'URL de connexion dans la configuration

### Synchronisation ne fonctionne pas
1. Vérifier les logs du serveur pour les événements émis
2. Vérifier les logs du client pour les événements reçus
3. Vérifier que les deux clients sont connectés au même serveur

### Performance
- Les événements sont émis uniquement lors de modifications réelles
- La synchronisation est optimisée pour éviter les boucles infinies
- Les connexions sont gérées automatiquement avec reconnexion 