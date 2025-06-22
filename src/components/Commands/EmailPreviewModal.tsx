import React from 'react';
import { X, Mail, Send } from 'lucide-react';

interface EmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onSend: () => void;
  subject: string;
  body: string;
  recipient: string;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ open, onClose, onSend, subject, body, recipient }) => {
  if (!open) return null;
  
  const handleSend = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSend();
  };
  
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };
  
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={handleModalClick}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Aperçu de l'email</h2>
              <p className="text-sm text-gray-500">Vérifiez le contenu avant envoi</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Email Details */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Destinataire :</span>
                  <div className="text-gray-900 mt-1">{recipient}</div>
                </div>
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Objet :</span>
                  <div className="text-gray-900 mt-1">{subject}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Body */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Contenu du message</h3>
            <div className="border border-gray-200 rounded-lg bg-white p-6 text-gray-800 whitespace-pre-line leading-relaxed shadow-sm">
              {body}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={handleSend}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Envoyer l'email</span>
          </button>
        </div>
      </div>
    </div>
  );
}; 