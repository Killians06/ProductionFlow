import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Command, CommandStatus } from '../../types';
import { getStatusLabel, getStatusColor } from '../../utils/statusUtils';
import { formatDate } from '../../utils/dateUtils';
import { ArrowUp, ArrowDown, Eye, Trash2, ChevronDown, Mail, Loader2 } from 'lucide-react';
import { COMMAND_STATUS_OPTIONS } from '../../utils/statusConfig';
import { useCommandsContext } from './CommandsContext';
import { EmailPreviewModal } from './EmailPreviewModal';

interface CommandsTableProps {
  commands: Command[];
  onSelect: (command: Command) => void;
}

type SortKey = 'numero' | 'client' | 'statut' | 'progression' | 'dateLivraison' | 'dateCreation';

type SortOrder = 'asc' | 'desc';

export const CommandsTable: React.FC<CommandsTableProps> = ({ commands, onSelect }) => {
  const { updateCommandStatus } = useCommandsContext();
  const [sortKey, setSortKey] = useState<SortKey>('numero');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [showNotifyButton, setShowNotifyButton] = useState<{ [id: string]: boolean }>({});
  const [pendingStatus, setPendingStatus] = useState<{ [id: string]: CommandStatus | null }>({});
  const [savingNotifyId, setSavingNotifyId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState<{ [id: string]: boolean }>({});
  const [notifyStatus, setNotifyStatus] = useState<{ [id: string]: 'idle' | 'success' | 'error' }>({});
  const [notifyMessage, setNotifyMessage] = useState<{ [id: string]: string }>({});

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sortedCommands = [...commands].sort((a, b) => {
    let aValue: any;
    let bValue: any;
    switch (sortKey) {
      case 'numero':
        aValue = a.numero;
        bValue = b.numero;
        break;
      case 'client':
        aValue = a.client?.nom || '';
        bValue = b.client?.nom || '';
        break;
      case 'statut':
        aValue = a.statut;
        bValue = b.statut;
        break;
      case 'progression':
        aValue = a.progression;
        bValue = b.progression;
        break;
      case 'dateLivraison':
        aValue = new Date(a.dateLivraison).getTime();
        bValue = new Date(b.dateLivraison).getTime();
        break;
      case 'dateCreation':
        aValue = new Date(a.dateCreation).getTime();
        bValue = new Date(b.dateCreation).getTime();
        break;
      default:
        aValue = '';
        bValue = '';
    }
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleStatusChange = async (command: Command, newStatus: CommandStatus) => {
    const previousStatus = command.statut;
    const commandId = command.id || command._id;
    
    // Masquer le bouton de notification si on change de statut à nouveau
    if (showNotifyButton[commandId] && pendingStatus[commandId] !== newStatus) {
      setShowNotifyButton(prev => ({ ...prev, [commandId]: false }));
      setPendingStatus(prev => ({ ...prev, [commandId]: null }));
    }
    
    setSavingStatusId(commandId);
    try {
      await updateCommandStatus(commandId, newStatus, command.progression, false);
      // Après la mise à jour réussie, afficher le bouton de notification
      setPendingStatus(prev => ({ ...prev, [commandId]: newStatus }));
      setShowNotifyButton(prev => ({ ...prev, [commandId]: true }));
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    } finally {
      setSavingStatusId(null);
    }
  };

  const handleNotifyClient = (command: Command) => {
    const commandId = command.id || command._id;
    if (!pendingStatus[commandId]) return;
    setShowEmailModal(prev => ({ ...prev, [commandId]: true }));
  };

  const handleSendMail = async (command: Command) => {
    const commandId = command.id || command._id;
    if (!pendingStatus[commandId]) return;
    
    setSavingNotifyId(commandId);
    setShowEmailModal(prev => ({ ...prev, [commandId]: false }));
    setNotifyStatus(prev => ({ ...prev, [commandId]: 'idle' }));
    setNotifyMessage(prev => ({ ...prev, [commandId]: '' }));
    
    try {
      await updateCommandStatus(commandId, pendingStatus[commandId]!, command.progression, true);
      
      // Succès
      setNotifyStatus(prev => ({ ...prev, [commandId]: 'success' }));
      setNotifyMessage(prev => ({ ...prev, [commandId]: 'Mail envoyé avec succès !' }));
      
      // Masquer le message de succès après 3 secondes
      setTimeout(() => {
        setNotifyStatus(prev => ({ ...prev, [commandId]: 'idle' }));
        setNotifyMessage(prev => ({ ...prev, [commandId]: '' }));
        setShowNotifyButton(prev => ({ ...prev, [commandId]: false }));
        setPendingStatus(prev => ({ ...prev, [commandId]: null }));
      }, 3000);
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      
      // Erreur
      setNotifyStatus(prev => ({ ...prev, [commandId]: 'error' }));
      setNotifyMessage(prev => ({ ...prev, [commandId]: 'Erreur lors de l\'envoi du mail' }));
      
      // Masquer le message d'erreur après 5 secondes
      setTimeout(() => {
        setNotifyStatus(prev => ({ ...prev, [commandId]: 'idle' }));
        setNotifyMessage(prev => ({ ...prev, [commandId]: '' }));
      }, 5000);
      
    } finally {
      setSavingNotifyId(null);
    }
  };

  // Génération du mail identique à CommandCard
  const getMailSubject = (command: Command, status: CommandStatus | null) =>
    `Mise à jour du statut de votre commande ${command.numero}`;
  const getMailBody = (command: Command, status: CommandStatus | null) =>
    `Bonjour ${command.client?.nom || 'Client'},\n\nLe statut de votre commande n°${command.numero} a été mis à jour :\n\nNouveau statut : ${getStatusLabel((status || command.statut) as any)}\nDate de livraison prévue : ${formatDate(new Date(command.dateLivraison))}\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nVotre équipe.`;

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('numero')}>
              N°
              {sortKey === 'numero' && (sortOrder === 'asc' ? <ArrowUp className="inline h-4 w-4 ml-1" /> : <ArrowDown className="inline h-4 w-4 ml-1" />)}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('client')}>
              Client
              {sortKey === 'client' && (sortOrder === 'asc' ? <ArrowUp className="inline h-4 w-4 ml-1" /> : <ArrowDown className="inline h-4 w-4 ml-1" />)}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('progression')}>
              Progression
              {sortKey === 'progression' && (sortOrder === 'asc' ? <ArrowUp className="inline h-4 w-4 ml-1" /> : <ArrowDown className="inline h-4 w-4 ml-1" />)}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('dateLivraison')}>
              Livraison
              {sortKey === 'dateLivraison' && (sortOrder === 'asc' ? <ArrowUp className="inline h-4 w-4 ml-1" /> : <ArrowDown className="inline h-4 w-4 ml-1" />)}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('dateCreation')}>
              Créée le
              {sortKey === 'dateCreation' && (sortOrder === 'asc' ? <ArrowUp className="inline h-4 w-4 ml-1" /> : <ArrowDown className="inline h-4 w-4 ml-1" />)}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('statut')} style={{ width: 180, minWidth: 180 }}>
              Statut
              {sortKey === 'statut' && (sortOrder === 'asc' ? <ArrowUp className="inline h-4 w-4 ml-1" /> : <ArrowDown className="inline h-4 w-4 ml-1" />)}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: 130, minWidth: 130, maxWidth: 170 }}></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedCommands.map((command) => {
            const commandId = command.id || command._id;
            return (
              <tr key={commandId} className="hover:bg-blue-50 transition cursor-pointer">
                <td className="px-4 py-3 font-semibold text-gray-900" onClick={() => onSelect(command)}>{command.numero}</td>
                <td className="px-4 py-3 text-gray-700" onClick={() => onSelect(command)}>{command.client?.nom}</td>
                <td className="px-4 py-3 text-gray-700" onClick={() => onSelect(command)}>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-500 ${command.progression === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${command.progression}%` }} />
                    </div>
                    <span className={command.progression === 100 ? 'text-green-600 font-medium' : ''}>{command.progression}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700" onClick={() => onSelect(command)}>{formatDate(new Date(command.dateLivraison))}</td>
                <td className="px-4 py-3 text-gray-700" onClick={() => onSelect(command)}>{formatDate(new Date(command.dateCreation))}</td>
                <td className="px-4 py-3 text-left" style={{ width: 180, minWidth: 180 }}>
                  <div className="flex items-center space-x-2">
                    <select
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(command.statut)} focus:outline-none`}
                      value={command.statut}
                      onChange={(e) => handleStatusChange(command, e.target.value as CommandStatus)}
                      onClick={e => e.stopPropagation()}
                      disabled={savingStatusId === commandId}
                      style={{ width: 130 }}
                    >
                      {statusOptions.map(opt => (
                        <option
                          key={opt.value}
                          value={opt.value}
                          className={getStatusColor(opt.value)}
                        >
                          {getStatusLabel(opt.value)}
                        </option>
                      ))}
                    </select>
                    <div className="w-6 flex items-center justify-center flex-shrink-0" style={{ height: '20px' }}>
                      {savingStatusId === commandId && <Loader2 className="animate-spin h-4 w-4 text-blue-500" />}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-left flex items-center justify-center" style={{ width: 130, minWidth: 130, maxWidth: 170 }}>
                  {showNotifyButton[commandId] && !savingStatusId ? (
                    <div className="w-full">
                      {notifyStatus[commandId] === 'success' ? (
                        <div className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded w-full justify-center">
                          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Envoyé</span>
                        </div>
                      ) : notifyStatus[commandId] === 'error' ? (
                        <div className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded w-full justify-center">
                          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span>Erreur</span>
                        </div>
                      ) : (
                        <button
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 w-full justify-center"
                          title="Notifier le client"
                          onClick={e => {
                            e.stopPropagation();
                            handleNotifyClient(command);
                          }}
                          disabled={savingNotifyId === commandId}
                        >
                          {savingNotifyId === commandId ? (
                            <Loader2 className="animate-spin h-4 w-4 mr-1" />
                          ) : (
                            <Mail className="h-4 w-4 mr-1" />
                          )}
                          Notifier
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-8" />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modals d'aperçu d'email pour chaque commande */}
      {sortedCommands.map((command) => {
        const commandId = command.id || command._id;
        return (
          <EmailPreviewModal
            key={`email-modal-${commandId}`}
            open={!!showEmailModal[commandId]}
            onClose={() => setShowEmailModal(prev => ({ ...prev, [commandId]: false }))}
            onSend={() => handleSendMail(command)}
            subject={getMailSubject(command, pendingStatus[commandId] || command.statut)}
            body={getMailBody(command, pendingStatus[commandId] || command.statut)}
            recipient={command.client?.email || ''}
          />
        );
      })}
    </div>
  );
}; 