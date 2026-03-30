import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';

export default function AdminHeader({ title, logo, extra }) {
  const navigate = useNavigate();
  const { lang, toggleLang } = useI18n();

  return (
    <header className="header">
      {logo ? (
        <img src="/logo.png" alt="Sarah's Nails" className="header-logo" />
      ) : (
        <h1>{title}</h1>
      )}
      <div className="header-actions">
        {extra}
        <button className="shop-preview-btn" onClick={() => navigate('/')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button className="lang-toggle" onClick={toggleLang}>
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
      </div>
    </header>
  );
}
