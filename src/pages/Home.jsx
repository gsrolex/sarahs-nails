import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { getCustomers, getAllBalances, createCustomer, uploadImage } from '../lib/db';
import { useCurrency } from '../lib/currency';

export default function Home() {
  const { t, lang, toggleLang } = useI18n();
  const { fmt, fmtAlt } = useCurrency();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [balances, setBalances] = useState({});
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [custs, bals] = await Promise.all([getCustomers(), getAllBalances()]);
      setCustomers(custs);
      setBalances(bals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      let avatar_url = null;
      if (avatarFile) {
        avatar_url = await uploadImage(avatarFile, 'avatars');
      }
      await createCustomer(newName.trim(), avatar_url, newPhone.trim() || null);
      setNewName('');
      setNewPhone('');
      setAvatarFile(null);
      setAvatarPreview(null);
      setShowAdd(false);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const sorted = [...filtered].sort((a, b) => (balances[b.id] || 0) - (balances[a.id] || 0));
  const totalOwed = Object.values(balances).reduce((sum, b) => sum + Math.max(0, b), 0);

  return (
    <div className="page">
      <header className="header">
        <img src="/logo.png" alt="Sarah's Nails" className="header-logo" />
        <button className="lang-toggle" onClick={toggleLang}>
          {lang === 'es' ? 'EN' : 'ES'}
        </button>
      </header>

      <div className="summary-card">
        <div>
          <span className="summary-label">{t('total_owed')}</span>
          <div className="summary-amount">{fmt(totalOwed)}</div>
        <div className="summary-alt">{fmtAlt(totalOwed)}</div>
        </div>
        <div className="summary-count">{customers.length} {t('home_title').toLowerCase()}</div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading" />
      ) : sorted.length === 0 ? (
        <div className="empty">{search ? t('no_results') : t('no_customers')}</div>
      ) : (
        <div className="customer-list">
          {sorted.map((c) => {
            const bal = balances[c.id] || 0;
            return (
              <div key={c.id} className="customer-card" onClick={() => navigate(`/customer/${c.id}`)}>
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="customer-avatar-img" />
                ) : (
                  <div className="customer-avatar">{c.name.charAt(0).toUpperCase()}</div>
                )}
                <div className="customer-info">
                  <span className="customer-name">{c.name}</span>
                </div>
                <span className={`customer-balance ${bal <= 0 ? 'settled' : 'owes'}`}>
                  {bal <= 0 ? t('settled') : fmt(bal)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => { setShowAdd(false); setAvatarPreview(null); setAvatarFile(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('add_customer')}</h2>
            <form onSubmit={handleAddCustomer}>
              <div className="avatar-upload" onClick={() => fileRef.current?.click()}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="avatar-upload-img" />
                ) : (
                  <div className="avatar-upload-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
              </div>
              <input
                type="text"
                placeholder={t('customer_name')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <input
                type="tel"
                placeholder={t('phone_placeholder')}
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setAvatarPreview(null); setAvatarFile(null); }}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? '...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button className="fab" onClick={() => setShowAdd(true)}>+</button>

      <nav className="bottom-nav">
        <button className="nav-btn active" onClick={() => navigate('/')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>{t('home_title')}</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/catalog')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span>{t('catalog')}</span>
        </button>
        <button className="nav-btn" onClick={() => navigate('/history')}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
          <span>{t('history_tab')}</span>
        </button>
      </nav>
    </div>
  );
}
