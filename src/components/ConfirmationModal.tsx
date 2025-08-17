import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  icon
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-600 dark:text-red-400',
          confirmBg: 'bg-red-500 hover:bg-red-600',
          confirmFocus: 'focus:ring-red-500',
          border: 'border-red-200 dark:border-red-700'
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          confirmBg: 'bg-yellow-500 hover:bg-yellow-600',
          confirmFocus: 'focus:ring-yellow-500',
          border: 'border-yellow-200 dark:border-yellow-700'
        };
      default:
        return {
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-600 dark:text-blue-400',
          confirmBg: 'bg-blue-500 hover:bg-blue-600',
          confirmFocus: 'focus:ring-blue-500',
          border: 'border-blue-200 dark:border-blue-700'
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Header */}
          <div className={`px-6 py-4 border-b ${styles.border}`}>
            <div className="flex items-center">
              {icon && (
                <div className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center mr-3`}>
                  {icon}
                </div>
              )}
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex flex-shrink-0 items-center justify-end space-x-3">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white ${styles.confirmBg} focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.confirmFocus} dark:focus:ring-offset-gray-800 transition-colors`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 