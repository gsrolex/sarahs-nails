import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useCurrency } from '../lib/currency';
import {
  getCustomer,
  getTransactions,
  getProducts,
  createTransaction,
  deleteTransaction,
  updateCustomer,
  uploadImage,
  calcBalance,
} from '../lib/db';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { fmt } = useCurrency();
  const fileRef = useRef();

  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCharge, setShowCharge] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { loadData(); }, [id]);

  async function loadData() {
    try {
      const [cust, txns, prods] = await Promise.all([
        getCustomer(id),
        getTransactions(id),
        getProducts(),
      ]);
      setCustomer(cust);
      setTransactions(txns);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, 'avatars');
      await updateCustomer(id, { avatar_url: url });
      setCustomer((c) => ({ ...c, avatar_url: url }));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleQuickCharge(product) {
    try {
      await createTransaction({
        customer_id: id,
        type: 'charge',
        amount: product.price,
        note: product.name,
        date: new Date().toISOString().split('T')[0],
        product_id: product.id,
      });
      await loadData();
      setShowCharge(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCustomCharge(e) {
    e.preventDefault();
    if (!customAmount || Number(customAmount) <= 0) return;
    try {
      await createTransaction({
        customer_id: id,
        type: 'charge',
        amount: Number(customAmount),
        note: customNote || null,
        date: new Date().toISOString().split('T')[0],
        product_id: null,
      });
      setCustomAmount('');
      setCustomNote('');
      setShowCharge(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handlePayment(e) {
    e.preventDefault();
    if (!customAmount || Number(customAmount) <= 0) return;
    try {
      await createTransaction({
        customer_id: id,
        type: 'payment',
        amount: Number(customAmount),
        note: customNote || null,
        date: new Date().toISOString().split('T')[0],
        product_id: null,
      });
      setCustomAmount('');
      setCustomNote('');
      setShowPayment(false);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteTransaction(txnId) {
    try {
      await deleteTransaction(txnId);
      setConfirmDelete(null);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="page"><div className="loading" /></div>;
  if (!customer) return <div className="page"><div className="empty">Not found</div></div>;

  const balance = calcBalance(transactions);
  const services = products.filter((p) => p.category === 'service');
  const productItems = products.filter((p) => p.category === 'product');

  return (
    <div className="page">
      <header className="header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h1>{customer.name}</h1>
        <div style={{ width: 40 }} />
      </header>

      {/* Profile hero */}
      <div className="profile-hero">
        <div className="profile-avatar-wrap" onClick={() => fileRef.current?.click()}>
          {customer.avatar_url ? (
            <img src={customer.avatar_url} alt="" className="profile-avatar-img" />
          ) : (
            <div className="profile-avatar-letter">{customer.name.charAt(0).toUpperCase()}</div>
          )}
          <div className="profile-avatar-edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
        </div>
        <div className={`profile-balance-card ${balance <= 0 ? 'settled' : ''}`}>
          <span className="profile-balance-label">{t('balance')}</span>
          <span className="profile-balance-amount">
            {balance <= 0 ? t('settled') : fmt(balance)}
          </span>
        </div>
      </div>

      {customer.phone && (
        <a
          href={`https://wa.me/${customer.phone.replace(/[^0-9+]/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          {t('message_on_whatsapp')}
        </a>
      )}

      <div className="action-buttons">
        <button className="btn-charge" onClick={() => { setShowCharge(true); setShowPayment(false); }}>
          + {t('add_charge')}
        </button>
        <button className="btn-payment" onClick={() => { setShowPayment(true); setShowCharge(false); }}>
          $ {t('add_payment')}
        </button>
      </div>

      {showCharge && (
        <div className="charge-panel">
          <h3>{t('quick_charge')}</h3>

          {services.length > 0 && (
            <>
              <h4>{t('services')}</h4>
              <div className="product-grid">
                {services.map((p) => (
                  <button key={p.id} className="product-btn" onClick={() => handleQuickCharge(p)}>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="product-btn-img" />
                    ) : (
                      <span className="product-btn-icon">{p.icon || '💅'}</span>
                    )}
                    <span className="product-btn-name">{p.name}</span>
                    <span className="product-btn-price">{fmt(p.price)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {productItems.length > 0 && (
            <>
              <h4>{t('products')}</h4>
              <div className="product-grid">
                {productItems.map((p) => (
                  <button key={p.id} className="product-btn" onClick={() => handleQuickCharge(p)}>
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="product-btn-img" />
                    ) : (
                      <span className="product-btn-icon">{p.icon || '👟'}</span>
                    )}
                    <span className="product-btn-name">{p.name}</span>
                    <span className="product-btn-price">{fmt(p.price)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <h4>{t('custom')}</h4>
          <form onSubmit={handleCustomCharge} className="custom-form">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={t('amount')}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
            <input
              type="text"
              placeholder={t('note')}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />
            <button type="submit" className="btn-primary">{t('save')}</button>
          </form>
        </div>
      )}

      {showPayment && (
        <div className="charge-panel payment-panel">
          <h3>{t('add_payment')}</h3>
          <form onSubmit={handlePayment} className="custom-form">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={t('amount')}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              autoFocus
            />
            <input
              type="text"
              placeholder={t('note')}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />
            <button type="submit" className="btn-primary">{t('save')}</button>
          </form>
        </div>
      )}

      <div className="section">
        <h3>{t('history')}</h3>
        {transactions.length === 0 ? (
          <div className="empty">{t('no_transactions')}</div>
        ) : (
          <div className="transaction-list">
            {transactions.map((txn) => (
              <div key={txn.id} className="transaction-item">
                <div className="txn-left">
                  <span className={`txn-type ${txn.type}`}>
                    {txn.type === 'charge' ? '↑' : '↓'}
                  </span>
                  <div className="txn-info">
                    <span className="txn-note">
                      {txn.products?.name || txn.note || t(txn.type)}
                    </span>
                    <span className="txn-date">{txn.date}</span>
                  </div>
                </div>
                <div className="txn-right">
                  <span className={`txn-amount ${txn.type}`}>
                    {txn.type === 'charge' ? '+' : '-'}{fmt(txn.amount)}
                  </span>
                  {confirmDelete === txn.id ? (
                    <div className="txn-confirm-delete">
                      <button className="btn-danger-sm" onClick={() => handleDeleteTransaction(txn.id)}>
                        {t('confirm')}
                      </button>
                      <button className="btn-secondary-sm" onClick={() => setConfirmDelete(null)}>
                        {t('cancel')}
                      </button>
                    </div>
                  ) : (
                    <button className="btn-delete-sm" onClick={() => setConfirmDelete(txn.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
