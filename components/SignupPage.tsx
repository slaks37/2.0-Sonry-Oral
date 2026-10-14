
import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from './Icon';

interface SignupPageProps {
  onSignupSuccess: () => void;
  onLoginClick: () => void;
  onBack: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignupSuccess, onLoginClick, onBack }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email && password && confirmPassword) {
      if (password !== confirmPassword) {
        setError(t('signupError'));
        return;
      }
      if (email.includes('@') && password.length > 3) {
         // Mock signup success
        onSignupSuccess();
      } else {
         setError('Invalid email or password too short.');
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
            <h2 className="text-2xl font-bold text-gray-800">{t('signup')}</h2>
        </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm font-medium border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900"
            placeholder="John Doe"
          />
        </div>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-transform transform active:scale-95 shadow-md mt-2"
        >
          {t('signup')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button onClick={onLoginClick} className="text-teal-600 hover:text-teal-800 text-sm font-medium">
          {t('alreadyHaveAccount')}
        </button>
      </div>
    </div>
  );
};

export default SignupPage;