import { Command, DashboardStats } from '../types';
import { addDays } from '../utils/dateUtils';

export const mockCommands: Command[] = [
  {
    _id: '1',
    numero: 'CMD-2024-001',
    client: { nom: 'TechCorp', email: 'contact@techcorp.com' },
    clientId: null,
    dateCreation: '2024-01-15',
    dateLivraison: '2024-02-15',
    statut: 'validated',
    progression: 25,
    produits: [
      {
        nom: 'Pièces mécaniques',
        specifications: 'Acier inoxydable 316L, tolérances ±0.1mm',
        quantite: 100
      },
      {
        nom: 'Boîtiers électroniques',
        specifications: 'PCB 4 couches, composants SMD',
        quantite: 50
      }
    ],
    etapesProduction: [
      {
        _id: 'step1',
        nom: 'Usinage des pièces',
        description: 'Découpe et perçage des pièces mécaniques',
        dureeEstimee: 8,
        statut: 'in-progress',
        dateDebut: new Date('2024-01-16'),
        responsable: { _id: 'user1', nom: 'Jean Dupont', email: 'jean@example.com' }
      },
      {
        _id: 'step2',
        nom: 'Assemblage électronique',
        description: 'Soudure des composants sur PCB',
        dureeEstimee: 6,
        statut: 'pending',
        responsable: { _id: 'user2', nom: 'Marie Martin', email: 'marie@example.com' }
      }
    ],
    history: []
  },
  {
    _id: '2',
    numero: 'CMD-2024-002',
    client: { nom: 'InnovateLab', email: 'info@innovatelab.com' },
    clientId: null,
    dateCreation: '2024-01-18',
    dateLivraison: '2024-02-28',
    statut: 'in-production',
    progression: 60,
    produits: [
      {
        nom: 'Système de contrôle',
        specifications: 'Microcontrôleur ARM, interface tactile',
        quantite: 25
      }
    ],
    etapesProduction: [
      {
        _id: 'step3',
        nom: 'Programmation',
        description: 'Développement du firmware',
        dureeEstimee: 12,
        statut: 'completed',
        dateDebut: new Date('2024-01-20'),
        dateFin: new Date('2024-01-25'),
        responsable: { _id: 'user3', nom: 'Pierre Durand', email: 'pierre@example.com' }
      },
      {
        _id: 'step4',
        nom: 'Tests fonctionnels',
        description: 'Validation du système complet',
        dureeEstimee: 4,
        statut: 'in-progress',
        dateDebut: new Date('2024-01-26'),
        responsable: { _id: 'user1', nom: 'Jean Dupont', email: 'jean@example.com' }
      }
    ],
    history: []
  },
  {
    _id: '3',
    numero: 'CMD-2024-003',
    client: {
      nom: 'Industries DEF',
      email: 'production@def.com',
    },
    clientId: null,
    produits: [
      {
        nom: 'Prototype machine',
        quantite: 1,
        specifications: 'Prototype complet avec documentation',
      },
    ],
    dateCreation: '2024-01-20',
    dateLivraison: addDays(new Date(), -2).toISOString().split('T')[0],
    statut: 'quality-check',
    progression: 95,
    etapesProduction: [
      {
        _id: '3-1',
        nom: 'Conception détaillée',
        description: 'Plans et spécifications techniques',
        dateDebut: new Date('2024-01-21'),
        dateFin: new Date('2024-01-25'),
        statut: 'completed',
        responsable: { _id: 'user4', nom: 'Tech Team', email: 'tech@example.com' },
        dureeEstimee: 32,
      },
      {
        _id: '3-2',
        nom: 'Fabrication',
        description: 'Fabrication du prototype',
        dateDebut: new Date('2024-01-26'),
        dateFin: new Date('2024-02-05'),
        statut: 'completed',
        responsable: { _id: 'user5', nom: 'Atelier A', email: 'atelier@example.com' },
        dureeEstimee: 80,
      },
      {
        _id: '3-3',
        nom: 'Tests et validation',
        description: 'Tests de fonctionnement et validation finale',
        dateDebut: new Date('2024-02-06'),
        statut: 'in-progress',
        responsable: { _id: 'user6', nom: 'Labo Qualité', email: 'qualite@example.com' },
        dureeEstimee: 16,
      },
    ],
    history: []
  },
];

export const mockStats: DashboardStats = {
  totalCommands: 23,
  inProgress: 8,
  completed: 12,
  delayed: 3,
  revenue: 145750,
  averageProductionTime: 6.2,
};