import React from 'react';
import { Calendar, User, Package, Clock, Loader2, Mail } from 'lucide-react';
import { Command, CommandStatus } from '../../types';
import { getStatusLabel, getStatusColor, getPriorityColor, getPriorityLabel } from '../../utils/statusUtils';
import { formatDate, getDaysUntilDeadline } from '../../utils/dateUtils';
import { useCommandsContext } from './CommandsContext';
import { EmailPreviewModal } from './EmailPreviewModal';

interface CommandCardProps {
  command: Command;
  onSelect?: (command: Command) => void;
  onStatusChange?: (command: Command) => void;
}

export const CommandCard: React.FC<CommandCardProps> = ({ command, onSelect, onStatusChange }) => {
  // Log de debug pour la progression
  console.log(`🟦 Render CommandCard ${command.numero} | progression:`, command.progression);

  const daysLeft = getDaysUntilDeadline(new Date(command.dateLivraison));
  const isOverdue = daysLeft < 0;
  const { updateCommandStatus } = useCommandsContext();
  const [saving, setSaving] = React.useState(false);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<CommandStatus | null>(null);
  const [mailPreviewUrl, setMailPreviewUrl] = React.useState<string | null>(null);
  const [showNotifyButton, setShowNotifyButton] = React.useState(false);
  const [lastChangedStatus, setLastChangedStatus] = React.useState<CommandStatus | null>(null);

  const statusOptions: { value: CommandStatus; label: string }[] = [
    { value: 'draft', label: getStatusLabel('draft') },
    { value: 'validated', label: getStatusLabel('validated') },
    { value: 'in-production', label: getStatusLabel('in-production') },
    { value: 'quality-check', label: getStatusLabel('quality-check') },
    { value: 'ready', label: getStatusLabel('ready') },
    { value: 'shipped', label: getStatusLabel('shipped') },
    { value: 'delivered', label: getStatusLabel('delivered') },
    { value: 'canceled', label: getStatusLabel('canceled') },
  ];

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as CommandStatus;
    const previousStatus = command.statut;
    
    // Masquer le bouton de notification si on change de statut à nouveau
    if (showNotifyButton && lastChangedStatus !== newStatus) {
      setShowNotifyButton(false);
      setLastChangedStatus(null);
    }
    
    // Mise à jour optimiste immédiate
    const optimisticCommand = { ...command, statut: newStatus };
    onStatusChange?.(optimisticCommand);
    
    setSaving(true);
    try {
      await updateCommandStatus(command._id, newStatus, command.progression, false);
      // Après la mise à jour réussie, afficher le bouton de notification
      setLastChangedStatus(newStatus);
      setShowNotifyButton(true);
    } catch (error) {
      // En cas d'erreur, revenir à l'ancien statut
      const revertedCommand = { ...command, statut: previousStatus };
      onStatusChange?.(revertedCommand);
      console.error('Erreur lors de la mise à jour du statut:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNotifyClient = () => {
    if (!lastChangedStatus) return;
    setPendingStatus(lastChangedStatus);
    setShowEmailModal(true);
  };

  const handleSendMail = async () => {
    if (!pendingStatus) return;
    setSaving(true);
    setShowEmailModal(false);
    
    // Mise à jour optimiste immédiate
    const optimisticCommand = { ...command, statut: pendingStatus };
    onStatusChange?.(optimisticCommand);
    
    try {
      const result = await updateCommandStatus(command._id, pendingStatus, command.progression, true);
      if (result && result.previewUrl) {
        setMailPreviewUrl(result.previewUrl);
      }
    } catch (error) {
      // En cas d'erreur, revenir à l'ancien statut
      const revertedCommand = { ...command, statut: command.statut };
      onStatusChange?.(revertedCommand);
      console.error('Erreur lors de la mise à jour du statut:', error);
    } finally {
      setSaving(false);
      setShowNotifyButton(false);
      setPendingStatus(null);
      setLastChangedStatus(null);
    }
  };

  // Génération du mail (exemple simple)
  const mailSubject = `Mise à jour du statut de votre commande ${command.numero}`;
  const mailBody = `Bonjour ${command.client.nom},\n\nLe statut de votre commande n°${command.numero} a été mis à jour :\n\nNouveau statut : ${getStatusLabel(pendingStatus || command.statut)}\nDate de livraison prévue : ${formatDate(new Date(command.dateLivraison))}\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nVotre équipe.`;

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onSelect?.(command)}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {command.numero}
            </h3>
            <p className="text-sm text-gray-600 flex items-center mt-1">
              <User className="h-4 w-4 mr-1" />
              {command.client.nom}
            </p>
          </div>
          <div className="flex flex-col space-y-2 items-end">
            <div className="flex items-center space-x-2">
              <select
                className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(command.statut)} focus:outline-none`}
                value={command.statut}
                onChange={handleStatusChange}
                onClick={e => e.stopPropagation()}
                disabled={saving}
                style={{ minWidth: 110 }}
              >
                {statusOptions.map(opt => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    style={{
                      backgroundColor: getStatusColor(opt.value).includes('bg-') ? undefined : undefined, // fallback
                      color: getStatusColor(opt.value).includes('text-') ? undefined : undefined, // fallback
                    }}
                    className={getStatusColor(opt.value)}
                  >
                    {getStatusLabel(opt.value)}
                  </option>
                ))}
              </select>
              {saving && <Loader2 className="animate-spin h-4 w-4 text-blue-500 ml-1" />}
              {showNotifyButton && !saving && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNotifyClient();
                  }}
                  className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors duration-200 flex items-center space-x-1"
                >
                  <Mail className="h-3 w-3" />
                  <span>Notifier</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <Package className="h-4 w-4 mr-2" />
            <span>{command.produits.length} produit{command.produits.length > 1 ? 's' : ''}</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Livraison: {formatDate(new Date(command.dateLivraison))}</span>
            {isOverdue && (
              <span className="ml-2 text-red-600 font-medium">
                ({Math.abs(daysLeft)} j de retard)
              </span>
            )}
            {!isOverdue && daysLeft <= 3 && (
              <span className="ml-2 text-orange-600 font-medium">
                ({daysLeft} j restants)
              </span>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            <span>Créée le {formatDate(new Date(command.dateCreation))}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progression</span>
            <span>{command.progression}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                command.progression === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${command.progression}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {command.etapesProduction.filter((e: any) => e.statut === 'completed').length || 0} / {command.etapesProduction.length || 0} étapes
          </div>
          <button 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(command);
            }}
          >
            Voir détails →
          </button>
        </div>
      </div>
      <EmailPreviewModal
        open={showEmailModal}
        onClose={() => { setShowEmailModal(false); setPendingStatus(null); }}
        onSend={handleSendMail}
        subject={mailSubject}
        body={mailBody}
        recipient={command.client.email}
      />
      {mailPreviewUrl && (
        <a
          href={mailPreviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline block mt-2"
        >
          Voir l'aperçu du mail envoyé
        </a>
      )}
    </div>
  );
};