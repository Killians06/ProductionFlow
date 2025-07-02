import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { Command } from '../../types';
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

type SortKey = 'numero' | 'client' | 'statut' | 'progression' | 'dateLivraison';

type SortOrder = 'asc' | 'desc';

export const CommandsTable: React.FC<CommandsTableProps> = ({ commands, onSelect }) => {
  const { updateCommandStatus } = useCommandsContext();
  const [sortKey, setSortKey] = useState<SortKey>('dateLivraison');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [openStatusMenu, setOpenStatusMenu] = useState<string | null>(null);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [menuDirection, setMenuDirection] = useState<'down' | 'up'>('down');
  const [menuAlignRight, setMenuAlignRight] = useState(false);
  const [showNotifyButton, setShowNotifyButton] = useState<{ [id: string]: boolean }>({});
  const [pendingStatus, setPendingStatus] = useState<{ [id: string]: string | null }>({});
  const [savingNotifyId, setSavingNotifyId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState<{ [id: string]: boolean }>({});

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
      default:
        aValue = '';
        bValue = '';
    }
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleNotifyClient = async (command: Command, status: string) => {
    setSavingNotifyId(command.id || command._id);
    try {
      await updateCommandStatus(command.id || command._id, status, command.progression, true);
      setShowNotifyButton(prev => ({ ...prev, [command.id || command._id]: false }));
      setPendingStatus(prev => ({ ...prev, [command.id || command._id]: null }));
    } finally {
      setSavingNotifyId(null);
    }
  };

  // Génération du mail identique à CommandCard
  const getMailSubject = (command: Command, status: string | null) =>
    `Mise à jour du statut de votre commande ${command.numero}`;
  const getMailBody = (command: Command, status: string | null) =>
    `Bonjour ${command.client?.nom || 'Client'},\n\nLe statut de votre commande n°${command.numero} a été mis à jour :\n\nNouveau statut : ${getStatusLabel((status || command.statut) as any)}\nDate de livraison prévue : ${formatDate(new Date(command.dateLivraison))}\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nVotre équipe.`;

  const handleOpenEmailModal = (command: Command, status: string) => {
    setShowEmailModal(prev => ({ ...prev, [command.id || command._id]: true }));
  };
  const handleCloseEmailModal = (command: Command) => {
    setShowEmailModal(prev => ({ ...prev, [command.id || command._id]: false }));
  };
  const handleSendMail = async (command: Command, status: string) => {
    setSavingNotifyId(command.id || command._id);
    try {
      await updateCommandStatus(command.id || command._id, status, command.progression, true);
      setShowNotifyButton(prev => ({ ...prev, [command.id || command._id]: false }));
      setPendingStatus(prev => ({ ...prev, [command.id || command._id]: null }));
      setShowEmailModal(prev => ({ ...prev, [command.id || command._id]: false }));
    } finally {
      setSavingNotifyId(null);
    }
  };

  const handleStatusMenuOpen = (e: React.MouseEvent, commandId: string) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const menuWidth = 192; // w-48
    const menuHeight = 48 * (COMMAND_STATUS_OPTIONS.length - 1); // approx (nb options)
    const padding = 8;
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 4;
    let direction: 'down' | 'up' = 'down';
    let alignRight = false;
    // Si le menu dépasse à droite, l'aligner à droite du bouton
    if (left + menuWidth > window.innerWidth - padding) {
      left = rect.right + window.scrollX - menuWidth;
      alignRight = true;
    }
    // Si le menu dépasse en bas, l'afficher au-dessus
    if (top + menuHeight > window.innerHeight - padding) {
      top = rect.top + window.scrollY - menuHeight - 4;
      direction = 'up';
    }
    setOpenStatusMenu(commandId);
    setMenuPosition({ top, left });
    setMenuDirection(direction);
    setMenuAlignRight(alignRight);
  };

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
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('statut')}>
              Statut
              {sortKey === 'statut' && (sortOrder === 'asc' ? <ArrowUp className="inline h-4 w-4 ml-1" /> : <ArrowDown className="inline h-4 w-4 ml-1" />)}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: 130, minWidth: 130, maxWidth: 170 }}></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 overflow-visible">
          {sortedCommands.map((command) => (
            <tr key={command.id || command._id} className="hover:bg-blue-50 transition cursor-pointer overflow-visible">
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
              <td className="px-4 py-3 text-left relative">
                <button
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(command.statut)} transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  style={{ minWidth: 170, maxWidth: 170, justifyContent: 'center' }}
                  onClick={e => handleStatusMenuOpen(e, command.id || command._id)}
                  disabled={savingStatusId === (command.id || command._id)}
                >
                  {getStatusLabel(command.statut)}
                  <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
                </button>
                {openStatusMenu === (command.id || command._id) && menuPosition && ReactDOM.createPortal(
                  <div
                    className={`z-50 w-48 bg-white rounded-md shadow-lg border border-gray-200 p-1 animate-in fade-in zoom-in-95 ${menuDirection === 'up' ? 'origin-bottom' : 'origin-top'}`}
                    style={{
                      position: 'absolute',
                      top: menuPosition.top,
                      left: menuPosition.left,
                      right: undefined,
                      bottom: undefined,
                      maxHeight: `calc(100vh - 16px)`
                    }}
                  >
                    {COMMAND_STATUS_OPTIONS.filter(opt => opt.value !== command.statut).map(opt => (
                      <button
                        key={opt.value}
                        className={`block w-full text-left px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${getStatusColor(opt.value)} hover:brightness-95`}
                        onClick={async () => {
                          setSavingStatusId(command.id || command._id);
                          setOpenStatusMenu(null);
                          setMenuPosition(null);
                          try {
                            await updateCommandStatus(command.id || command._id, opt.value, command.progression, false);
                            setShowNotifyButton(prev => ({ ...prev, [command.id || command._id]: true }));
                            setPendingStatus(prev => ({ ...prev, [command.id || command._id]: opt.value }));
                          } finally {
                            setSavingStatusId(null);
                          }
                        }}
                        disabled={savingStatusId === (command.id || command._id)}
                      >
                        {getStatusLabel(opt.value)}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </td>
              <td className="px-4 py-3 text-left flex items-center justify-center" style={{ width: 130, minWidth: 130, maxWidth: 170 }}>
                {showNotifyButton[command.id || command._id] && pendingStatus[command.id || command._id] ? (
                  <>
                    <button
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 w-full justify-center"
                      title="Notifier le client"
                      onClick={e => {
                        e.stopPropagation();
                        handleOpenEmailModal(command, pendingStatus[command.id || command._id]!);
                      }}
                      disabled={savingNotifyId === (command.id || command._id)}
                    >
                      {savingNotifyId === (command.id || command._id) ? (
                        <Loader2 className="animate-spin h-4 w-4 mr-1" />
                      ) : (
                        <Mail className="h-4 w-4 mr-1" />
                      )}
                      Notifier
                    </button>
                    <EmailPreviewModal
                      open={!!showEmailModal[command.id || command._id]}
                      onClose={() => handleCloseEmailModal(command)}
                      onSend={() => handleSendMail(command, pendingStatus[command.id || command._id]!)}
                      subject={getMailSubject(command, pendingStatus[command.id || command._id] || command.statut)}
                      body={getMailBody(command, pendingStatus[command.id || command._id] || command.statut)}
                      recipient={command.client?.email || ''}
                    />
                  </>
                ) : (
                  <div className="w-full h-8" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 