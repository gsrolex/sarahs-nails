import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';

const PASS_HASH = 'teamoperla';

export default function AuthGate({ children }) {
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('perla_auth');
    if (saved === 'true') setUnlocked(true);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (input === PASS_HASH) {
      setUnlocked(true);
      localStorage.setItem('perla_auth', 'true');
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  }

  if (unlocked) return children;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/logo.png" alt="Sarah's Nails" className="auth-logo" />
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className={`auth-input ${error ? 'shake' : ''}`}
            placeholder={t('password')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn-primary auth-btn">
            {t('enter')}
          </button>
        </form>
      </div>
    </div>
  );
}
