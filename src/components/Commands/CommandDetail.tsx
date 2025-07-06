import React from 'react';
import { 
  X, 
  Calendar, 
  User, 
  Package, 
  FileText, 
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  Pause,
  Loader2,
  Edit,
  Save,
  RotateCcw,
  Printer,
  RefreshCw,
  Play,
  Mail
} from 'lucide-react';
import QRCode from 'qrcode';
import { Command, CommandStatus, User as UserType, ProductionStep } from '../../types';
import { COMMAND_STATUS_OPTIONS, getStatusLabel, getStatusColor } from '../../utils/statusConfig';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { CommandForm } from './CommandForm';
import { useCommandsContext } from './CommandsContext';
import { CommandHistory } from './CommandHistory';
import { usersApi, commandsApi } from '../../services/api';
import { emitCommandEvent } from '../../utils/syncEvents';
import { EmailPreviewModal } from './EmailPreviewModal';

interface CommandDetailProps {
  command: Command;
  onClose: () => void;
}

export const CommandDetail: React.FC<CommandDetailProps> = ({ command: initialCommand, onClose }) => {
  const { updateCommandStatus, updateCommand, deleteCommand, refetch, commands } = useCommandsContext();
  const [command, setCommand] = React.useState<Command | null>(initialCommand);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [loadingDelete, setLoadingDelete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savingStatus, setSavingStatus] = React.useState(false);
  const [notifyClient, setNotifyClient] = React.useState(false);
  const [mailPreviewUrl, setMailPreviewUrl] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<UserType[]>([]);
  const [isAssigning, setIsAssigning] = React.useState<string | null>(null);
  const [openStepMenu, setOpenStepMenu] = React.useState<string | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<UserType | null>(null);
  const [generatingQR, setGeneratingQR] = React.useState(false);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<CommandStatus | null>(null);
  const [showNotifyButton, setShowNotifyButton] = React.useState(false);
  const [lastChangedStatus, setLastChangedStatus] = React.useState<CommandStatus | null>(null);

  const commandId = initialCommand._id;

  // Synchroniser le state local avec le state global du contexte
  React.useEffect(() => {
    const globalCommand = commands.find(cmd => cmd._id === commandId || cmd.id === commandId);
    if (globalCommand) {
      console.log('CommandDetail - Synchronisation avec le state global:', globalCommand);
      setCommand(globalCommand);
    }
  }, [commands, commandId]);

  // Debug: afficher les données de la commande
  React.useEffect(() => {
    console.log('CommandDetail - Données de la commande:', command);
    console.log('CommandDetail - Étapes de production:', command?.etapesProduction);
    console.log('CommandDetail - Propriétés disponibles:', Object.keys(command || {}));
  }, [command]);

  React.useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      console.log('Utilisateur récupéré du localStorage:', parsedUser);
      setCurrentUser(parsedUser);
    }

    const fetchUsers = async () => {
      try {
        const userList = await usersApi.getAll();
        setUsers(userList);
      } catch (error) {
        console.error("Impossible de charger la liste des utilisateurs", error);
      }
    };
    
    fetchUsers();
  }, [commandId]);

  // Fonction pour forcer un rafraîchissement manuel
  const handleManualRefresh = async () => {
    if (!commandId) return;
    setIsLoading(true);
    try {
      const fullCommand = await commandsApi.getById(commandId);
      setCommand(fullCommand);
    } catch (err) {
      setError('Impossible de charger les détails de la commande.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepStatusOptions = [
    { value: 'in-progress', label: 'En cours' },
    { value: 'completed', label: 'Terminée' },
    { value: 'blocked', label: 'Bloquée' },
    { value: 'pending', label: 'En attente' },
  ];

  const statusOptions: { value: CommandStatus; label: string }[] = COMMAND_STATUS_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }));

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepStatusLabel = (status: string) => {
    const labels = {
      'pending': 'En attente',
      'in-progress': 'En cours',
      'completed': 'Terminée',
      'blocked': 'Bloquée',
      // Au cas où d'anciens statuts français seraient encore là
      'en attente': 'En attente',
      'en cours': 'En cours',
      'terminee': 'Terminée',
      'bloquée': 'Bloquée',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleDelete = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette commande ?')) return;
    setLoadingDelete(true);
    setError(null);
    try {
      await deleteCommand(commandId);
      onClose();
      refetch();
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la suppression');
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleStatusChange = async (newStatus: CommandStatus) => {
    setIsStatusMenuOpen(false);
    
    // Si on change de statut à nouveau, masquer le bouton de notification
    if (showNotifyButton && lastChangedStatus !== newStatus) {
      setShowNotifyButton(false);
      setLastChangedStatus(null);
    }
    
    // Mise à jour optimiste et affichage du bouton Notifier
    setSavingStatus(true);
    try {
      // Mettre à jour SANS notifier
      const result = await updateCommandStatus(commandId, newStatus, command?.progression ?? 0, false);
      
      // Mettre à jour l'état local pour le bouton de notification
      setLastChangedStatus(newStatus);
      setShowNotifyButton(true);

      // Émettre l'événement de synchronisation APRÈS la réponse backend, avec la vraie progression
      const progression = result?.command?.progression ?? command?.progression ?? 0;
      emitCommandEvent('STATUS_CHANGE', { 
        commandId, 
        newStatus, 
        progression
      });
    } catch (e) {
      setError('Erreur lors de la mise à jour du statut');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleNotifyClient = () => {
    if (!lastChangedStatus) return;
    setPendingStatus(lastChangedStatus);
    setShowEmailModal(true);
  };

  const handleSendMail = async () => {
    if (!pendingStatus) return;
    setSavingStatus(true);
    setShowEmailModal(false);
    
    try {
      // Mettre à jour AVEC la notification
      await updateCommandStatus(commandId, pendingStatus, command?.progression ?? 0, true);
    } catch (error) {
      setError('Erreur lors de l\'envoi de la notification');
    } finally {
      setSavingStatus(false);
      setPendingStatus(null);
      setShowNotifyButton(false);
      setLastChangedStatus(null);
    }
  };

  const handleSave = async (data: any) => {
    try {
      await updateCommand(commandId, data);
      setIsEditing(false);
      refetch();
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleAssign = async (stepId: string, userId: string) => {
    setIsAssigning(stepId);
    try {
      const updatedCommand = await commandsApi.assignStep(commandId, stepId, userId);
      
      // Émettre l'événement de synchronisation pour l'assignation
      emitCommandEvent('UPDATE', { 
        commandId, 
        updates: { 
          etapesProduction: updatedCommand.etapesProduction 
        } 
      });
    } catch (e: any) {
      console.error('Erreur dans handleAssign:', e);
      setError(e?.response?.data?.error || e.message || "Erreur lors de l'assignation.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsAssigning(null);
    }
  };

  const handleCompleteStep = async (stepId: string) => {
    try {
      setOpenStepMenu(null); // Fermer le menu après l'action
      const updatedCommand = await commandsApi.completeProductionStep(commandId, stepId);
      
      // Émettre l'événement de synchronisation pour la validation de l'étape
      emitCommandEvent('UPDATE', { 
        commandId, 
        updates: { 
          etapesProduction: updatedCommand.etapesProduction,
          progression: updatedCommand.progression 
        } 
      });
    } catch (e: any) {
      console.error('Erreur dans handleCompleteStep:', e);
      setError(e?.response?.data?.error || e.message || "Erreur lors de la validation de l'étape.");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleStepStatusChange = async (stepId: string, newStatus: string) => {
    try {
      console.log('handleStepStatusChange appelé avec:', { stepId, newStatus, commandId });
      setOpenStepMenu(null);
      setError(null);
      const updatedCommand = await commandsApi.updateStepStatus(commandId, stepId, newStatus);
      console.log('Commande mise à jour reçue:', updatedCommand);
      
      // Émettre l'événement de synchronisation pour la mise à jour de l'étape
      emitCommandEvent('UPDATE', { 
        commandId, 
        updates: { 
          etapesProduction: updatedCommand.etapesProduction,
          progression: updatedCommand.progression 
        } 
      });
    } catch (e: any) {
      console.error('Erreur dans handleStepStatusChange:', e);
      setError(e?.response?.data?.error || e.message || "Erreur lors du changement de statut de l'étape.");
      setTimeout(() => setError(null), 5000);
    }
  };

  // Fonction d'impression qui exclut les étapes de production et l'historique
  const handlePrint = async () => {
    setGeneratingQR(true);
    
    // Générer le QR code d'abord
    const quickStatusUrl = `http://77.129.48.8:5173/quick-status/${commandId}`;
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(quickStatusUrl, {
        width: 100,
        margin: 2,
        color: {
          dark: '#1f2937',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Erreur lors de la génération du QR code:', err);
      // En cas d'erreur, on continue sans QR code
      qrCodeDataUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjNmNGY2Ii8+Cjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNmI3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXJyZXVyIFEgUiBDb2RlPC90ZXh0Pgo8L3N2Zz4K';
    }

    // Maintenant ouvrir la fenêtre d'impression avec le QR code généré
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setGeneratingQR(false);
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Commande ${command?.numero}</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white;
              color: #333;
            }
            .header { 
              margin-bottom: 30px; 
              border-bottom: 3px solid #3b82f6; 
              padding-bottom: 15px; 
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .command-number {
              font-size: 28px;
              font-weight: 700;
              color: #1f2937;
              margin: 0;
            }
            .delivery-date {
              font-size: 18px;
              font-weight: 600;
              color: #059669;
              margin: 0;
            }
            .section { 
              margin-bottom: 30px; 
            }
            .section h3 { 
              color: #374151; 
              border-bottom: 2px solid #e5e7eb; 
              padding-bottom: 8px; 
              margin-bottom: 15px;
              font-size: 18px;
              font-weight: 600;
            }
            .client-info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 30px; 
            }
            .client-box { 
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #3b82f6;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            .client-name {
              font-size: 20px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 10px 0;
            }
            .client-detail {
              margin: 8px 0;
              font-size: 14px;
              color: #6b7280;
            }
            .client-detail strong {
              color: #374151;
              font-weight: 500;
            }
            .qr-section {
              background: #f8fafc; 
              padding: 20px; 
              border-radius: 8px; 
              border-left: 4px solid #3b82f6;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              text-align: center;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .qr-code {
              margin-bottom: 15px;
            }
            .qr-title {
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 8px;
            }
            .qr-description {
              font-size: 12px;
              color: #6b7280;
              line-height: 1.4;
              max-width: 200px;
            }
            .products-section {
              margin-top: 30px;
            }
            .products-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 15px;
              background: white;
              border-radius: 8px;
              overflow: hidden;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            .products-table th { 
              background: #f3f4f6; 
              color: #374151;
              font-weight: 600;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.5px;
              padding: 15px 12px;
              text-align: left;
              border-bottom: 2px solid #e5e7eb;
            }
            .products-table td { 
              padding: 15px 12px; 
              border-bottom: 1px solid #f3f4f6;
              vertical-align: top;
            }
            .products-table tr:hover {
              background: #f9fafb;
            }
            .product-name {
              font-weight: 600;
              color: #1f2937;
            }
            .product-specs {
              color: #6b7280;
              font-size: 14px;
              line-height: 1.4;
              white-space: pre-wrap;
            }
            .product-quantity {
              font-weight: 500;
              color: #059669;
              text-align: center;
            }
            @media print {
              body { 
                margin: 0; 
                padding: 15px;
              }
              .no-print { 
                display: none; 
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="command-number">${command?.numero}</h1>
            <div class="delivery-date">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">Livraison prévue le</div>
              <div>${command?.dateLivraison ? formatDate(new Date(command.dateLivraison)) : 'Date non définie'}</div>
            </div>
          </div>

          <div class="client-info-grid">
            <div class="section">
              <h3>Informations client</h3>
              <div class="client-box">
                <div class="client-name">${command?.clientId?.nomSociete || command?.client?.nom}</div>
                ${command?.clientId?.personneContact ? `
                  <div class="client-detail">
                    <strong>Contact:</strong> ${command.clientId.personneContact.prenom} ${command.clientId.personneContact.nom}
                  </div>
                ` : ''}
                <div class="client-detail">
                  <strong>Email:</strong> ${command?.clientId?.email || command?.client?.email}
                </div>
                ${command?.clientId?.telephone ? `
                  <div class="client-detail">
                    <strong>Téléphone:</strong> ${command.clientId.telephone}
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="section">
              <h3>Mise à jour rapide</h3>
              <div class="qr-section">
                <div class="qr-code">
                  <img src="${qrCodeDataUrl}" alt="QR Code pour mise à jour rapide" style="width: 100px; height: 100px;" />
                </div>
              </div>
            </div>
          </div>

          <div class="products-section">
            <h3>Produits commandés</h3>
            <table class="products-table">
              <thead>
                <tr>
                  <th style="width: 25%;">Produit</th>
                  <th style="width: 60%;">Spécifications</th>
                  <th style="width: 15%; text-align: center;">Quantité</th>
                </tr>
              </thead>
              <tbody>
                ${command?.produits.map(p => `
                  <tr>
                    <td class="product-name">${p.nom}</td>
                    <td class="product-specs">${p.specifications || '-'}</td>
                    <td class="product-quantity">${p.quantite}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Attendre que le contenu soit chargé avant d'imprimer
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      setGeneratingQR(false);
    };
  };

  if (!command) {
    return <div>Chargement...</div>; // Ou un meilleur indicateur de chargement
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 flex items-center space-x-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg font-medium">Chargement des détails...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center z-30 shadow-lg">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Modifier la commande' : 'Détail de la commande'} {command.numero}
          </h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {!isEditing && (
            <>
              <button
                onClick={handlePrint}
                disabled={generatingQR}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 flex items-center space-x-2"
              >
                {generatingQR ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Génération...</span>
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4" />
                    <span>Imprimer</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Éditer</span>
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-600 rounded-full transition-all duration-200 bg-red-500 text-white shadow-md hover:shadow-lg hover:scale-105"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEditing ? (
          <CommandForm
            initialValues={command}
            onCancel={handleCancelEdit}
            onSubmit={handleSave}
          />
        ) : (
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4" role="alert">
                <strong className="font-bold">Erreur:</strong>
                <span className="block sm:inline ml-2">{error}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

              {/* COLONNE DE GAUCHE */}
              <div className="space-y-6">
                {/* Infos Client */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Client</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center"><User className="h-4 w-4 text-gray-500 mr-2" /><span className="text-gray-900 font-medium">{command.clientId?.nomSociete || command.client?.nom}</span></div>
                    {command.clientId?.personneContact && (<div className="ml-6 text-sm text-gray-600">Contact: {command.clientId.personneContact.prenom} {command.clientId.personneContact.nom}</div>)}
                    <div className="ml-6 text-sm text-gray-600">Email: {command.clientId?.email || command.client?.email}</div>
                    {command.clientId?.telephone && (<div className="ml-6 text-sm text-gray-600">Téléphone: {command.clientId.telephone}</div>)}
                  </div>
                </div>
              </div>

              {/* COLONNE DE DROITE */}
              <div className="space-y-6">
                 {/* Dates */}
                 <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Dates</h3>
                  <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4">
                    <div><label className="text-sm font-medium text-gray-500">Créée le</label><p className="mt-1 text-gray-900">{formatDate(new Date(command.dateCreation))}</p></div>
                    <div><label className="text-sm font-medium text-gray-500">Livraison prévue</label><p className="mt-1 text-gray-900">{formatDate(new Date(command.dateLivraison))}</p></div>
                  </div>
                </div>

                {/* Statut Global */}
                <div>
                  <div className="flex items-center mb-2 space-x-3">
                    <h3 className="text-lg font-medium text-gray-900 mr-4">Statut</h3>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => !savingStatus && setIsStatusMenuOpen(!isStatusMenuOpen)}
                        className={`relative inline-flex items-center justify-between px-3 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors ${getStatusColor(command.statut)}`}
                        disabled={savingStatus}
                      >
                        <span>{getStatusLabel(command.statut)}</span>
                        {savingStatus 
                          ? <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          : <svg className="h-5 w-5 ml-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        }
                      </button>
                      {isStatusMenuOpen && (
                        <div className="absolute z-10 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 p-1">
                          {statusOptions.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => handleStatusChange(opt.value)}
                              className={`block w-full text-left px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${getStatusColor(opt.value)} hover:brightness-95`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {showNotifyButton && (
                      <button
                        onClick={handleNotifyClient}
                        disabled={savingStatus}
                        className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed animate-in fade-in zoom-in-95"
                      >
                        {savingStatus ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Envoi...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="h-4 w-4" />
                            <span>Notifier le client</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION PRODUITS (Pleine largeur) */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2 px-8">Produits</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="w-3/12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                      <th scope="col" className="w-7/12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détails</th>
                      <th scope="col" className="w-2/12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {command.produits.map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate">{p.nom}</td>
                        <td className="px-4 py-4 whitespace-pre-wrap break-words text-sm text-gray-500">{p.specifications}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{p.quantite}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION ÉTAPES DE PRODUCTION (Pleine largeur) */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2 px-8">Progression & Étapes</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-base font-medium text-blue-700">Progression globale</span>
                    <span className={`text-sm font-medium ${command.progression === 100 ? 'text-green-700' : 'text-blue-700'}`}>{command.progression ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all duration-500 ${command.progression === 100 ? 'bg-green-600' : 'bg-blue-600'}`} style={{ width: `${command.progression ?? 0}%` }}></div>
                  </div>
                </div>

                <ul className="space-y-4">
                  {(command.etapesProduction || [])?.map((etape: ProductionStep) => {
                    if(currentUser) {
                      console.log('Comparaison permission étape:', {
                        currentUserId: currentUser.id,
                        responsibleUserId: etape.responsable?._id,
                        areEqual: currentUser.id === etape.responsable?._id
                      });
                    }
                    console.log('Données de l\'étape:', {
                      etapeId: etape._id,
                      nom: etape.nom,
                      responsable: etape.responsable,
                      responsableId: etape.responsable?._id,
                      responsableNom: etape.responsable?.nom
                    });
                    const isUserResponsible = currentUser?.id === etape.responsable?._id;
                    return (
                    <li key={etape._id} className="flex items-start p-3 bg-white rounded-lg shadow-sm border border-gray-200">
                      <div className="flex-shrink-0 mr-3 pt-1">
                        {getStepIcon(etape.statut)}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-gray-800">{etape.nom}</p>
                          <div className="relative">
                            <button 
                              onClick={() => isUserResponsible && setOpenStepMenu(openStepMenu === etape._id ? null : etape._id)}
                              className={`px-3 py-1 text-sm font-medium rounded-full transition-all duration-200 ${
                                etape.statut === 'completed' ? 'bg-green-100 text-green-800' :
                                etape.statut === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                etape.statut === 'blocked' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              } ${isUserResponsible ? 'cursor-pointer hover:brightness-95' : 'cursor-not-allowed opacity-70'}`}
                              disabled={!isUserResponsible}
                            >
                              {getStepStatusLabel(etape.statut)}
                              {isUserResponsible && <svg className="inline-block w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>}
                            </button>
                            {openStepMenu === etape._id && isUserResponsible && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200 p-1">
                                {stepStatusOptions
                                  .filter(opt => opt.value !== etape.statut)
                                  .map(opt => (
                                    <button 
                                      key={opt.value}
                                      onClick={() => handleStepStatusChange(etape._id, opt.value)}
                                      className="w-full text-left block px-3 py-1.5 text-sm rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                                    >
                                      {opt.label}
                                    </button>
                                  ))
                                }
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {etape.dateDebut && <span>Début: {formatDateTime(new Date(etape.dateDebut))}</span>}
                          {etape.dateFin && <span className="ml-4">Fin: {formatDateTime(new Date(etape.dateFin))}</span>}
                        </div>
                        <div className="flex items-center mt-2 text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2 text-gray-400" />
                          Responsable: 
                          {isAssigning === etape._id ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          ) : (
                            <select 
                              value={etape.responsable?._id || ''} 
                              onChange={(e) => handleAssign(etape._id, e.target.value)}
                              className="ml-2 bg-transparent border-0 rounded-md p-0 focus:ring-0 text-blue-600 font-medium"
                            >
                              <option value="">Non assigné</option>
                              {users.map(user => (
                                <option key={user._id} value={user._id}>{user.nom}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
                </ul>
              </div>
            </div>
            
            {/* Historique et Actions */}
            <div className="pt-6 border-t border-gray-200">
              <div className="px-8">
                <CommandHistory commandId={commandId} />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 flex justify-end px-8">
                <button
                    onClick={handleDelete}
                    disabled={loadingDelete}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 flex items-center space-x-2"
                >
                    {loadingDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    <span>Supprimer la commande</span>
                </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal d'aperçu du mail */}
      {pendingStatus && (
        <EmailPreviewModal
          open={showEmailModal}
          onClose={() => { setShowEmailModal(false); setPendingStatus(null); }}
          onSend={handleSendMail}
          subject={`Mise à jour du statut de votre commande ${command?.numero}`}
          body={`Bonjour ${command?.clientId?.nomSociete || command?.client?.nom || 'Client'},\n\nLe statut de votre commande n°${command?.numero} a été mis à jour :\n\nNouveau statut : ${pendingStatus ? getStatusLabel(pendingStatus) : getStatusLabel(command?.statut || 'pending')}\nDate de livraison prévue : ${command?.dateLivraison ? formatDate(new Date(command.dateLivraison)) : 'Non définie'}\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nVotre équipe.`}
          recipient={command?.clientId?.email || command?.client?.email || ''}
        />
      )}
    </>
  );
};