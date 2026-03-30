import { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import AdminNav from '../components/AdminNav';
import AdminHeader from '../components/AdminHeader';
import { getCustomers } from '../lib/db';

export default function Marketing() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [message, setMessage] = useState(() => localStorage.getItem('perla_marketing_draft') || '');
  const [sending, setSending] = useState(false);

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem('perla_marketing_draft', message);
  }, [message]);
  const [sendIndex, setSendIndex] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const custs = await getCustomers();
        setCustomers(custs.filter(c => c.phone));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === customers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(customers.map(c => c.id)));
    }
  }

  function startSending() {
    if (!message.trim() || selected.size === 0) return;
    setSending(true);
    setSendIndex(0);
    sendToCustomer(0);
  }

  function sendToCustomer(idx) {
    const selectedList = customers.filter(c => selected.has(c.id));
    if (idx >= selectedList.length) return;
    const customer = selectedList[idx];
    const phone = customer.phone.replace(/[^0-9+]/g, '');
    const msg = encodeURIComponent(message.trim());
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    setSendIndex(idx);
  }

  function nextCustomer() {
    const selectedList = customers.filter(c => selected.has(c.id));
    const nextIdx = sendIndex + 1;
    if (nextIdx >= selectedList.length) {
      setSending(false);
      setMessage('');
      setSelected(new Set());
      return;
    }
    setSendIndex(nextIdx);
    sendToCustomer(nextIdx);
  }

  const selectedList = customers.filter(c => selected.has(c.id));

  return (
    <div className="page">
      <AdminHeader title={t('marketing')} />

      {loading ? (
        <div className="loading" />
      ) : customers.length === 0 ? (
        <div className="empty">{t('no_phone_customers')}</div>
      ) : sending ? (
        /* Sending flow */
        <div className="marketing-sending">
          <div className="marketing-progress">
            <span className="marketing-progress-count">{sendIndex + 1} / {selectedList.length}</span>
            <div className="marketing-progress-bar">
              <div className="marketing-progress-fill" style={{ width: `${((sendIndex + 1) / selectedList.length) * 100}%` }} />
            </div>
          </div>

          <div className="marketing-current">
            <span className="marketing-current-label">{t('sending_to')}</span>
            <div className="marketing-current-customer">
              {selectedList[sendIndex]?.avatar_url ? (
                <img src={selectedList[sendIndex].avatar_url} alt="" className="marketing-avatar" />
              ) : (
                <div className="marketing-avatar-letter">{selectedList[sendIndex]?.name.charAt(0).toUpperCase()}</div>
              )}
              <span className="marketing-current-name">{selectedList[sendIndex]?.name}</span>
            </div>
          </div>

          <div className="marketing-msg-preview">{message}</div>

          {sendIndex + 1 < selectedList.length ? (
            <button className="btn-primary marketing-next-btn" onClick={nextCustomer}>
              {t('next')} → {selectedList[sendIndex + 1]?.name}
            </button>
          ) : (
            <button className="btn-primary marketing-next-btn" onClick={nextCustomer}>
              {t('done_sending')} ✓
            </button>
          )}
        </div>
      ) : (
        /* Select + compose */
        <>
          {/* Message input */}
          <textarea
            className="marketing-textarea"
            placeholder={t('message_placeholder')}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />

          {/* Select all / count */}
          <div className="marketing-toolbar">
            <button className="marketing-select-all" onClick={selectAll}>
              {selected.size === customers.length ? t('deselect_all') : t('select_all')}
            </button>
            <span className="marketing-count">
              {selected.size} {t('customers_selected')}
            </span>
          </div>

          {/* Customer list */}
          <div className="marketing-list">
            {customers.map((c) => (
              <button
                key={c.id}
                className={`marketing-customer ${selected.has(c.id) ? 'selected' : ''}`}
                onClick={() => toggleSelect(c.id)}
              >
                <span className="marketing-check">{selected.has(c.id) ? '✓' : ''}</span>
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="marketing-avatar" />
                ) : (
                  <div className="marketing-avatar-letter">{c.name.charAt(0).toUpperCase()}</div>
                )}
                <div className="marketing-customer-info">
                  <span className="marketing-customer-name">{c.name}</span>
                  <span className="marketing-customer-phone">{c.phone}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Send button */}
          <button
            className="marketing-send-btn"
            disabled={!message.trim() || selected.size === 0}
            onClick={startSending}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            {t('send_message')} ({selected.size})
          </button>
        </>
      )}

      <AdminNav />
    </div>
  );
}
