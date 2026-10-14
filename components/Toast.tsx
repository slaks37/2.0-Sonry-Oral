import React, { useEffect, useState } from 'react';
import Icon from './Icon';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start fade-in animation
    const enterTimeout = setTimeout(() => setIsVisible(true), 50);

    const timer = setTimeout(() => {
      // Start fade-out animation
      setIsVisible(false);
      // Call onClose after fade-out completes
      setTimeout(onClose, 300); 
    }, 3000); // Auto-dismiss after 3 seconds

    return () => {
      clearTimeout(enterTimeout);
      clearTimeout(timer);
    }
  }, [onClose]);

  const config = {
    success: {
      icon: 'check' as 'check',
      bg: 'bg-green-100',
      border: 'border-green-500',
      text: 'text-green-800',
      iconColor: 'text-green-500'
    },
    error: {
      icon: 'danger' as 'danger',
      bg: 'bg-red-100',
      border: 'border-red-500',
      text: 'text-red-800',
      iconColor: 'text-red-500'
    },
  };

  const currentConfig = config[type];
  
  const handleClose = () => {
      setIsVisible(false);
      setTimeout(onClose, 300);
  }

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 min-w-[300px] max-w-sm rounded-md shadow-lg ${currentConfig.bg} border-l-4 ${currentConfig.border} transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`} role="alert">
      <div className="flex items-center p-4">
        <div className={`flex-shrink-0 ${currentConfig.iconColor}`}>
          <Icon type={currentConfig.icon} className="w-6 h-6" />
        </div>
        <div className={`ml-3 text-sm font-medium ${currentConfig.text}`}>
          {message}
        </div>
        <button
          onClick={handleClose}
          className="ml-auto -mx-1.5 -my-1.5 bg-transparent rounded-lg p-1.5 inline-flex h-8 w-8 text-gray-500 hover:text-gray-800 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
          aria-label="Close"
        >
          <Icon type="close" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Toast;