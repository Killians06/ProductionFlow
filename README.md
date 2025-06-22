# ProductionFlow - Gestion de Commandes en Temps Réel

**ProductionFlow** est une application web complète pour la gestion de commandes, conçue pour les entreprises de production et de services. Elle offre un suivi détaillé de l'avancement des commandes, une gestion centralisée des clients et des utilisateurs, et une synchronisation instantanée des données entre tous les membres d'une même organisation.

*(![Aperçu de l'application](https://i.imgur.com/votre-image.png))*
*(Pensez à remplacer ce lien par une capture d'écran de votre application)*

---

## ✨ Fonctionnalités

- **Suivi de Commandes** : Cycle de vie complet de la commande (création, modification, historique détaillé).
- **Gestion des Clients** : Centralisation des informations clients avec possibilité de les désactiver.
- **Flux de Production** : Définition, assignation et validation des étapes de production avec mise à jour de la progression en temps réel.
- **Gestion d'Organisation** : Invitez des membres, gérez les rôles (`admin`, `user`) et consultez les informations de votre équipe.
- **Espace "Mon Compte"** : Permet aux utilisateurs de voir leurs informations personnelles.
- **Notifications en Temps Réel** : Grâce à **Socket.IO**, chaque changement majeur (statut, assignation) est notifié à tous les utilisateurs connectés.
- **Synchronisation Multi-plateforme** : Les données sont synchronisées sur tous les onglets et appareils ouverts.
- **Tableau de Bord Dynamique** : Visualisez en un coup d'œil les statistiques clés, les commandes urgentes, et l'activité récente.
- **Impression et QR Code** : Générez une fiche de production imprimable avec un QR code pour des mises à jour de statut rapides depuis un appareil mobile.

---

## 🛠️ Technologies Utilisées

- **Frontend** : React, TypeScript, Vite, TailwindCSS
- **Backend** : Node.js, Express.js
- **Base de données** : MongoDB (avec Mongoose)
- **Communication en temps réel** : Socket.IO
- **Authentification** : JSON Web Tokens (JWT)
- **Gestion d'état** : React Context API & Hooks

---

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) (v16.x ou supérieur)
- [npm](https://www.npmjs.com/) ou [yarn](https://yarnpkg.com/)
- Une instance [MongoDB](https://www.mongodb.com/) (locale ou sur Atlas)

### Installation

1.  **Clonez le dépôt**
    ```sh
    git clone https://github.com/Killians06/ProductionFlow.git
    cd ProductionFlow
    ```

2.  **Installez les dépendances**
    ```sh
    # Pour le client et le serveur
    npm install
    ```

3.  **Configurez les variables d'environnement**
    
    À la racine du projet, créez un fichier `.env` en vous basant sur `EXAMPLE.env` (s'il existe) et ajoutez-y :
    
    ```env
    # Chaîne de connexion à votre base de données MongoDB
    MONGODB_URI=mongodb+srv://<user>:<password>@votrecluster.mongodb.net/ProductionFlow
    
    # Clé secrète pour signer les jetons JWT
    JWT_SECRET=votre_super_secret_aleatoire_ici
    ```

### Lancement

Vous devez lancer le serveur et le client dans deux terminaux séparés.


1.  **Lancez le serveur backend et le client frontend**
    ```sh
    npm run dev
    ```
    Le serveur backend démarrera sur `http://localhost:5001`.
    L'application sera accessible sur `http://localhost:5173`.

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Si vous souhaitez améliorer l'application, n'hésitez pas à forker le dépôt, créer une branche et ouvrir une Pull Request.

1. Fork le projet
2. Créez votre branche de fonctionnalité (`git checkout -b feature/NouvelleFonctionnalite`)
3. Commitez vos changements (`git commit -m 'Ajout de NouvelleFonctionnalite'`)
4. Pushez vers la branche (`git push origin feature/NouvelleFonctionnalite`)
5. Ouvrez une Pull Request

---

## 📄 Licence

Ce projet est distribué sous la licence MIT. Voir le fichier `LICENSE` pour plus de détails.
