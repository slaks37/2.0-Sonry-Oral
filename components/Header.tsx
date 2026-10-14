
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, onLogout }) => {
  const { language, setLanguage, t } = useLanguage();
  return (
    <header className="bg-white shadow-md w-full p-4 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center">
        <div className="h-10 px-3 bg-teal-600 text-white flex items-center justify-center rounded-lg font-bold text-md mr-3 tracking-wider">
          SONRI
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">{t('headerTitle')}</h1>
          <p className="text-sm text-gray-500 hidden sm:block">{t('headerSubtitle')}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex bg-gray-100 rounded-lg p-1">
            <button 
            onClick={() => setLanguage('id')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'id' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
            ID
            </button>
            <button 
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
            EN
            </button>
        </div>
        
        {isLoggedIn && onLogout && (
            <button 
                onClick={onLogout}
                className="ml-2 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
            >
                {t('logout')}
            </button>
        )}
      </div>
    </header>
  );
};

export default Header;
