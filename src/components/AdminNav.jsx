import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../lib/i18n';

export default function AdminNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useI18n();

  const isActive = (path) => {
    if (path === '/admin') return pathname === '/admin' || pathname === '/admin/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav">
      <button className={`nav-btn ${isActive('/admin') && !isActive('/admin/') ? 'active' : isActive('/admin') && pathname === '/admin' ? 'active' : ''}`} onClick={() => navigate('/admin')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span>{t('home_title')}</span>
      </button>
      <button className={`nav-btn ${isActive('/admin/catalog') ? 'active' : ''}`} onClick={() => navigate('/admin/catalog')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
        <span>{t('catalog')}</span>
      </button>
      <button className={`nav-btn ${isActive('/admin/stories') ? 'active' : ''}`} onClick={() => navigate('/admin/stories')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
        <span>Media</span>
      </button>
      <button className={`nav-btn ${isActive('/admin/history') ? 'active' : ''}`} onClick={() => navigate('/admin/history')}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
        <span>{t('history_tab')}</span>
      </button>
    </nav>
  );
}
