import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from './Icon';

interface SignupPageProps {
  onSignupSuccess: (user: any, token: string) => void;
  onLoginClick: () => void;
  onBack: () => void;
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignupSuccess, onLoginClick, onBack }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organizationCode, setOrganizationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError(t('fillAllFieldsError'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('signupError'));
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi harus minimal 6 karakter.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          organizationCode: organizationCode.trim() || 'POS-001',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Pendaftaran gagal. Periksa kembali informasi Anda.');
      }

      localStorage.setItem('sonri_token', data.token);
      localStorage.setItem('sonri_user', JSON.stringify(data.user));
      onSignupSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err?.message || 'Gagal mendaftarkan akun ke server.');
    } finally {
      setIsLoading(false);
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
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 disabled:bg-gray-200"
            placeholder="Dr. Budi Santoso / Bidan Ani"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 disabled:bg-gray-200"
            placeholder="petugas@posyandu.id"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kode Faskes / Posyandu (Opsional)</label>
          <input
            type="text"
            value={organizationCode}
            onChange={(e) => setOrganizationCode(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 disabled:bg-gray-200"
            placeholder="Default: POS-001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 disabled:bg-gray-200"
            placeholder="Minimal 6 karakter"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('confirmPassword')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all text-gray-900 disabled:bg-gray-200"
            placeholder="Ulangi kata sandi"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-transform transform active:scale-95 shadow-md mt-2 disabled:bg-teal-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              Mendaftarkan Akun...
            </span>
          ) : (
            t('signup')
          )}
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