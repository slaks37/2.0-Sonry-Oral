
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from './Icon';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onSignupClick: () => void;
  onBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onSignupClick, onBack }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Mock login validation
      if (email.includes('@') && password.length > 3) {
        onLoginSuccess();
      } else {
        setError(t('loginError'));
      }
    } else {
      setError(t('fillAllFieldsError'));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
      <div className="flex items-center mb-6">
          <button onClick={onBack} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full mr-2">
            <Icon type="back" className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">{t('login')}</h2>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm font-medium border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900"
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-transform transform active:scale-95 shadow-md mt-2"
        >
          {t('login')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button onClick={onSignupClick} className="text-teal-600 hover:text-teal-800 text-sm font-medium">
          {t('dontHaveAccount')}
        </button>
      </div>
    </div>
  );
};

export default LoginPage;