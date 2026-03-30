import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';
import AdminHeader from '../components/AdminHeader';
import { useI18n } from '../lib/i18n';
import { useCurrency } from '../lib/currency';
import { useToast } from '../components/Toast';
import {
  getCustomers, getAllBalances, createCustomer, deleteCustomer, updateCustomer,
  getTransactions, getProducts, createTransaction, deleteTransaction,
  uploadImage, reorderCustomers, calcBalance, updateProduct,
} from '../lib/db';

function vibrate() {
  if (navigator.vibrate) navigator.vibrate(20);
}

export default function Home() {
  const { t, lang, toggleLang } = useI18n();
  const toast = useToast();
  const { fmt, fmtAlt, rate } = useCurrency();
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

  // Expanded customer
  const [expandedId, setExpandedId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCharge, setShowCharge] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [confirmDeleteTxn, setConfirmDeleteTxn] = useState(null);
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(null);
  const [selectedCharges, setSelectedCharges] = useState([]);
  const [chargeInUsd, setChargeInUsd] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  // Edit customer
  const [editCustomer, setEditCustomer] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(null);
  const editFileRef = useRef();

  // Drag reorder
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragTimeout = useRef(null);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

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

  async function expandCustomer(id) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setShowCharge(false);
    setShowPayment(false);
    setCustomAmount('');
    setCustomNote('');
    setConfirmDeleteTxn(null);
    try {
      const [txns, prods] = await Promise.all([getTransactions(id), getProducts()]);
      setTransactions(txns);
      setProducts(prods);
    } catch (err) {
      console.error(err);
    }
  }

  // --- Add customer ---
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
      if (avatarFile) avatar_url = await uploadImage(avatarFile, 'avatars');
      await createCustomer(newName.trim(), avatar_url, newPhone.trim() || null);
      setNewName(''); setNewPhone(''); setAvatarFile(null); setAvatarPreview(null); setShowAdd(false);
      await loadData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  // --- Edit customer ---
  function openEditCustomer(c) {
    setEditCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone || '');
    setEditAvatarPreview(c.avatar_url);
    setEditAvatarFile(null);
  }

  function handleEditFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditAvatarFile(file);
    setEditAvatarPreview(URL.createObjectURL(file));
  }

  async function handleEditCustomer(e) {
    e.preventDefault();
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      const updates = { name: editName.trim(), phone: editPhone.trim() || null };
      if (editAvatarFile) {
        updates.avatar_url = await uploadImage(editAvatarFile, 'avatars');
      }
      await updateCustomer(editCustomer.id, updates);
      setEditCustomer(null); setEditAvatarFile(null); setEditAvatarPreview(null);
      await loadData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  // --- Delete customer ---
  async function handleDeleteCustomer(id) {
    try {
      await deleteCustomer(id);
      setConfirmDeleteCustomer(null);
      if (expandedId === id) setExpandedId(null);
      await loadData();
    } catch (err) { console.error(err); }
  }

  // --- Quick charge ---
  async function handleQuickCharge(product) {
    const price = Number(product.price);
    // No price — open custom amount with the product name pre-filled
    if (!price || price <= 0) {
      setShowCharge(true);
      setShowPayment(false);
      setCustomNote(product.name);
      setCustomAmount('');
      return;
    }
    try {
      const txn = await createTransaction({
        customer_id: expandedId, type: 'charge', amount: price,
        note: product.name, date: new Date().toISOString().split('T')[0], product_id: product.id,
      });
      // Auto-unpublish one-off products (not services)
      if (product.category === 'product' && product.published) {
        await updateProduct(product.id, { published: false });
      }
      vibrate();
      const [txns, bals, prods] = await Promise.all([
        getTransactions(expandedId), getAllBalances(), getProducts(),
      ]);
      setTransactions(txns);
      setBalances(bals);
      setProducts(prods);
      toast({
        message: `✓ ${product.name} — ${fmt(price)}`,
        onUndo: async () => {
          await deleteTransaction(txn.id);
          if (product.category === 'product' && product.published) {
            await updateProduct(product.id, { published: true });
          }
          const [t2, b2, p2] = await Promise.all([
            getTransactions(expandedId), getAllBalances(), getProducts(),
          ]);
          setTransactions(t2);
          setBalances(b2);
          setProducts(p2);
        },
      });
    } catch (err) { console.error(err); }
  }

  async function handleCustomCharge(e) {
    e.preventDefault();
    let amt = Number(customAmount);
    if (!customAmount || amt <= 0) return;
    // Convert USD to Córdobas if needed (amounts stored in Córdobas)
    if (chargeInUsd) amt = amt * rate;
    try {
      const txn = await createTransaction({
        customer_id: expandedId, type: 'charge', amount: amt,
        note: customNote || null, date: new Date().toISOString().split('T')[0], product_id: null,
      });
      vibrate();
      const note = customNote || t('charge');
      setCustomAmount(''); setCustomNote(''); setShowCharge(false); setChargeInUsd(false);
      const [txns, bals] = await Promise.all([getTransactions(expandedId), getAllBalances()]);
      setTransactions(txns); setBalances(bals);
      toast({
        message: `✓ ${note} — ${fmt(amt)}`,
        onUndo: async () => {
          await deleteTransaction(txn.id);
          const [t2, b2] = await Promise.all([getTransactions(expandedId), getAllBalances()]);
          setTransactions(t2); setBalances(b2);
        },
      });
    } catch (err) { console.error(err); }
  }

  async function handlePayment(e) {
    e.preventDefault();
    let amt = Number(customAmount);
    if (!customAmount || amt <= 0) return;
    if (chargeInUsd) amt = amt * rate;
    try {
      const txn = await createTransaction({
        customer_id: expandedId, type: 'payment', amount: amt,
        note: customNote || null, date: new Date().toISOString().split('T')[0], product_id: null,
      });
      vibrate();
      setCustomAmount(''); setCustomNote(''); setShowPayment(false); setSelectedCharges([]); setChargeInUsd(false);
      const [txns, bals] = await Promise.all([getTransactions(expandedId), getAllBalances()]);
      setTransactions(txns); setBalances(bals);
      toast({
        message: `✓ ${t('payment')} — ${fmt(amt)}`,
        onUndo: async () => {
          await deleteTransaction(txn.id);
          const [t2, b2] = await Promise.all([getTransactions(expandedId), getAllBalances()]);
          setTransactions(t2); setBalances(b2);
        },
      });
    } catch (err) { console.error(err); }
  }

  async function handleDeleteTxn(txnId) {
    try {
      await deleteTransaction(txnId);
      setConfirmDeleteTxn(null);
      const [txns, bals] = await Promise.all([getTransactions(expandedId), getAllBalances()]);
      setTransactions(txns); setBalances(bals);
    } catch (err) { console.error(err); }
  }

  // --- Drag reorder ---
  function handleDragStart(i) { setDragIdx(i); }
  function handleDragOver(e, i) { e.preventDefault(); setOverIdx(i); }
  async function handleDrop(i) {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
    const newList = [...sorted];
    const [moved] = newList.splice(dragIdx, 1);
    newList.splice(i, 0, moved);
    setCustomers(newList);
    setDragIdx(null);
    setOverIdx(null);
    try { await reorderCustomers(newList.map(c => c.id)); } catch (err) { console.error(err); }
  }

  // Touch drag
  const handleTouchStart = useCallback((e, i) => {
    touchStartY.current = e.touches[0].clientY;
    dragTimeout.current = setTimeout(() => {
      isDragging.current = true;
      setDragIdx(i);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 400);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging.current) {
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (dy > 10) clearTimeout(dragTimeout.current);
      return;
    }
    e.preventDefault();
    const touch = e.touches[0];
    const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
    const card = elements.find(el => el.dataset.dragIdx !== undefined);
    if (card) setOverIdx(Number(card.dataset.dragIdx));
  }, []);

  const handleTouchEnd = useCallback(async () => {
    clearTimeout(dragTimeout.current);
    if (isDragging.current && dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const newList = [...customers];
      const [moved] = newList.splice(dragIdx, 1);
      newList.splice(overIdx, 0, moved);
      setCustomers(newList);
      try { await reorderCustomers(newList.map(c => c.id)); } catch (err) { console.error(err); }
    }
    isDragging.current = false;
    setDragIdx(null);
    setOverIdx(null);
  }, [dragIdx, overIdx, customers]);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const sorted = search ? [...filtered].sort((a, b) => (balances[b.id] || 0) - (balances[a.id] || 0)) : filtered;
  const totalOwed = Object.values(balances).reduce((sum, b) => sum + Math.max(0, b), 0);

  // Auto-expand when search narrows to one result
  useEffect(() => {
    if (search && sorted.length === 1 && expandedId !== sorted[0].id) {
      expandCustomer(sorted[0].id);
    }
  }, [sorted.length, search]);

  const services = products.filter((p) => p.category === 'service');
  const productItems = products.filter((p) => p.category === 'product');

  return (
    <div className="page">
      <AdminHeader logo />

      <div className="summary-card">
        <div className="summary-top">
          <span className="summary-label">{t('total_owed')}</span>
          <span className="summary-badge">{customers.length} {t('home_title').toLowerCase()}</span>
        </div>
        <div className="summary-amount">{fmt(totalOwed)}</div>
        <div className="summary-alt">{fmtAlt(totalOwed)}</div>
      </div>

      <div className="search-bar">
        <input type="text" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading" />
      ) : sorted.length === 0 ? (
        <div className="empty">{search ? t('no_results') : t('no_customers')}</div>
      ) : (
        <div className="customer-list">
          {sorted.map((c, i) => {
            const bal = balances[c.id] || 0;
            const isExpanded = expandedId === c.id;
            const isBeingDragged = dragIdx === i;
            const isDragOver = overIdx === i && dragIdx !== null && dragIdx !== i;

            return (
              <div
                key={c.id}
                className={`customer-card-wrap ${isExpanded ? 'expanded' : ''} ${isBeingDragged ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                data-drag-idx={i}
                draggable={!isExpanded}
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                onTouchStart={(e) => handleTouchStart(e, i)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="customer-card" onClick={() => expandCustomer(c.id)}>
                  <div className="drag-handle">⠿</div>
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
                  {confirmDeleteCustomer === c.id ? (
                    <div className="customer-delete-confirm" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-danger-sm" onClick={() => handleDeleteCustomer(c.id)}>{t('confirm')}</button>
                      <button className="btn-secondary-sm" onClick={() => setConfirmDeleteCustomer(null)}>{t('cancel')}</button>
                    </div>
                  ) : (
                    <button
                      className="customer-delete-btn"
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteCustomer(c.id); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="customer-expanded">
                    {/* Top bar: edit + whatsapp */}
                    <div className="expanded-top-bar">
                      <button className="edit-customer-btn" onClick={() => openEditCustomer(c)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        {t('edit')}
                      </button>
                      {c.phone && (
                        <a href={`https://wa.me/${c.phone.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer" className="whatsapp-btn-sm">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      )}
                      {c.phone && bal > 0 && (
                        <button className="send-balance-btn" onClick={() => {
                          const charges = transactions.filter(tx => tx.type === 'charge');
                          const items = charges.map(tx => `• ${tx.products?.name || tx.note || t('charge')} — ${fmt(tx.amount)}`).join('\n');
                          const msg = encodeURIComponent(`Hola ${c.name}!\n\nTu saldo pendiente:\n${items}\n\nTotal: ${fmt(bal)}\n\nSarah's Nails`);
                          const phone = c.phone.replace(/[^0-9+]/g, '');
                          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          {t('send_message')}
                        </button>
                      )}
                    </div>

                    {/* Custom charge — always visible on top */}
                    {!showPayment && (
                      <div className="quick-charge-section">
                        <form onSubmit={handleCustomCharge} className="custom-form">
                          <div className="amount-input-row">
                            <button type="button" className={`currency-input-toggle ${chargeInUsd ? 'usd' : ''}`} onClick={() => setChargeInUsd(!chargeInUsd)}>
                              {chargeInUsd ? '$' : 'C$'}
                            </button>
                            <input type="number" step="0.01" min="0" placeholder={t('amount')} value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
                          </div>
                          {chargeInUsd && customAmount && Number(customAmount) > 0 && (
                            <span className="currency-convert-hint">= C${(Number(customAmount) * rate).toFixed(2)}</span>
                          )}
                          <input type="text" placeholder={t('note')} value={customNote} onChange={(e) => setCustomNote(e.target.value)} />
                          <button type="submit" className="btn-primary" disabled={!customAmount || Number(customAmount) <= 0}>
                            + {t('add_charge')} {customAmount && Number(customAmount) > 0 ? `— ${chargeInUsd ? `$${customAmount}` : `C$${customAmount}`}` : ''}
                          </button>
                        </form>

                        {/* Products toggle */}
                        {(services.length > 0 || productItems.length > 0) && (
                          <>
                            <button className="products-toggle" onClick={() => setShowProducts(!showProducts)}>
                              <span>{t('quick_charge')} ({services.length + productItems.length})</span>
                              <span className={`products-toggle-arrow ${showProducts ? 'open' : ''}`}>›</span>
                            </button>
                            {showProducts && (
                              <div className="product-grid">
                                {services.map((p) => (
                                  <button key={p.id} className="product-btn" onClick={() => handleQuickCharge(p)}>
                                    {p.image_url && <img src={p.image_url} alt="" className="product-btn-img" />}
                                    <span className="product-btn-name">{p.name}</span>
                                    {Number(p.price) > 0 && <span className="product-btn-price">{fmt(p.price)}</span>}
                                  </button>
                                ))}
                                {productItems.map((p) => (
                                  <button key={p.id} className="product-btn" onClick={() => handleQuickCharge(p)}>
                                    {p.image_url && <img src={p.image_url} alt="" className="product-btn-img" />}
                                    <span className="product-btn-name">{p.name}</span>
                                    {Number(p.price) > 0 && <span className="product-btn-price">{fmt(p.price)}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Payment section */}
                    <div className="payment-section">
                      {!showPayment ? (
                        <button className="btn-payment full" onClick={() => {
                          setShowPayment(true);
                          setShowCharge(false);
                          setSelectedCharges([]);
                          setCustomAmount('');
                          setCustomNote('');
                        }}>
                          $ {t('add_payment')}
                        </button>
                      ) : (
                        <div className="charge-panel payment-panel">
                          <div className="payment-panel-header">
                            <h3>{t('add_payment')}</h3>
                            <button className="btn-close-panel" onClick={() => setShowPayment(false)}>✕</button>
                          </div>

                          {/* Outstanding charges to select */}
                          {(() => {
                            const unpaidCharges = transactions.filter(tx => tx.type === 'charge');
                            if (unpaidCharges.length === 0) return null;
                            const selectedTotal = selectedCharges.reduce((sum, id) => {
                              const tx = unpaidCharges.find(t => t.id === id);
                              return sum + (tx ? Number(tx.amount) : 0);
                            }, 0);
                            return (
                              <>
                                <h4>{t('outstanding_charges')}</h4>
                                <p className="select-hint">{t('select_items')}</p>
                                <div className="selectable-charges">
                                  {unpaidCharges.slice(0, 15).map((tx) => {
                                    const isSelected = selectedCharges.includes(tx.id);
                                    return (
                                      <button
                                        key={tx.id}
                                        type="button"
                                        className={`selectable-charge ${isSelected ? 'selected' : ''}`}
                                        onClick={() => {
                                          const next = isSelected
                                            ? selectedCharges.filter(id => id !== tx.id)
                                            : [...selectedCharges, tx.id];
                                          setSelectedCharges(next);
                                          const total = next.reduce((s, id) => {
                                            const t2 = unpaidCharges.find(t => t.id === id);
                                            return s + (t2 ? Number(t2.amount) : 0);
                                          }, 0);
                                          setCustomAmount(total > 0 ? String(total) : '');
                                        }}
                                      >
                                        <span className="selectable-charge-check">{isSelected ? '✓' : ''}</span>
                                        <span className="selectable-charge-name">{tx.products?.name || tx.note || t('charge')}</span>
                                        <span className="selectable-charge-date">{tx.date}</span>
                                        <span className="selectable-charge-amount">{fmt(tx.amount)}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {selectedCharges.length > 0 && (
                                  <div className="selected-total">
                                    {selectedCharges.length} {t('selected')} — <strong>{fmt(selectedTotal)}</strong>
                                  </div>
                                )}
                                {bal > 0 && (
                                  <button
                                    type="button"
                                    className="pay-all-btn"
                                    onClick={() => {
                                      setSelectedCharges(unpaidCharges.map(tx => tx.id));
                                      setCustomAmount(String(bal));
                                    }}
                                  >
                                    {t('pay_all')} — {fmt(bal)}
                                  </button>
                                )}
                              </>
                            );
                          })()}

                          <form onSubmit={handlePayment} className="custom-form" style={{ marginTop: 12 }}>
                            <input type="number" step="0.01" min="0" placeholder={t('amount')} value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setSelectedCharges([]); }} />
                            <input type="text" placeholder={t('note')} value={customNote} onChange={(e) => setCustomNote(e.target.value)} />
                            <button type="submit" className="btn-primary" disabled={!customAmount || Number(customAmount) <= 0}>
                              {t('add_payment')} {customAmount ? `— ${fmt(Number(customAmount))}` : ''}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Pending charges */}
                    {(() => {
                      const pendingCharges = transactions.filter(tx => tx.type === 'charge');
                      return (
                        <div className="section">
                          <h3>{t('outstanding_charges')} ({pendingCharges.length})</h3>
                          {pendingCharges.length === 0 ? (
                            <div className="empty-sm">{t('no_transactions')}</div>
                          ) : (
                            <div className="transaction-list">
                              {pendingCharges.map((txn) => (
                                <div key={txn.id} className="transaction-item">
                                  <div className="txn-left">
                                    <span className="txn-type charge">↑</span>
                                    <div className="txn-info">
                                      <span className="txn-note">{txn.products?.name || txn.note || t('charge')}</span>
                                      <span className="txn-date">{txn.date}</span>
                                    </div>
                                  </div>
                                  <div className="txn-right">
                                    <span className="txn-amount charge">
                                      {fmt(txn.amount)}
                                    </span>
                                    {confirmDeleteTxn === txn.id ? (
                                      <div className="txn-confirm-delete">
                                        <button className="btn-danger-sm" onClick={() => handleDeleteTxn(txn.id)}>{t('confirm')}</button>
                                        <button className="btn-secondary-sm" onClick={() => setConfirmDeleteTxn(null)}>{t('cancel')}</button>
                                      </div>
                                    ) : (
                                      <button className="btn-delete-sm" onClick={() => setConfirmDeleteTxn(txn.id)}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
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
              <input type="text" placeholder={t('customer_name')} value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
              <input type="tel" placeholder={t('phone_placeholder')} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAdd(false); setAvatarPreview(null); setAvatarFile(null); }}>{t('cancel')}</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? '...' : t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editCustomer && (
        <div className="modal-overlay" onClick={() => { setEditCustomer(null); setEditAvatarFile(null); setEditAvatarPreview(null); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('edit')}</h2>
            <form onSubmit={handleEditCustomer}>
              <div className="avatar-upload" onClick={() => editFileRef.current?.click()}>
                {editAvatarPreview ? (
                  <img src={editAvatarPreview} alt="" className="avatar-upload-img" />
                ) : (
                  <div className="avatar-upload-placeholder">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  </div>
                )}
                <input ref={editFileRef} type="file" accept="image/*" hidden onChange={handleEditFileChange} />
              </div>
              <input type="text" placeholder={t('customer_name')} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
              <input type="tel" placeholder={t('phone_placeholder')} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setEditCustomer(null); setEditAvatarFile(null); setEditAvatarPreview(null); }}>{t('cancel')}</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? '...' : t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <button className="fab" onClick={() => setShowAdd(true)}>+</button>

      <AdminNav />
    </div>
  );
}
