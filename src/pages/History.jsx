import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../components/AdminNav';
import AdminHeader from '../components/AdminHeader';
import { useI18n } from '../lib/i18n';
import { useCurrency } from '../lib/currency';
import { getAllTransactions } from '../lib/db';

const MONTH_KEYS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

export default function History() {
  const { t } = useI18n();
  const { fmt, fmtAlt, currency, toggleCurrency, rate, updateRate } = useCurrency();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('monthly'); // monthly | yearly
  const [showRate, setShowRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(rate));

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await getAllTransactions();
      setTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Stats for current month
  const monthStats = useMemo(() => {
    const monthTxns = transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const charges = monthTxns.filter((tx) => tx.type === 'charge').reduce((s, tx) => s + Number(tx.amount), 0);
    const payments = monthTxns.filter((tx) => tx.type === 'payment').reduce((s, tx) => s + Number(tx.amount), 0);
    return { charges, payments, net: charges - payments, count: monthTxns.length };
  }, [transactions, currentYear, currentMonth]);

  // Stats for current year
  const yearStats = useMemo(() => {
    const yearTxns = transactions.filter((tx) => new Date(tx.date).getFullYear() === currentYear);
    const charges = yearTxns.filter((tx) => tx.type === 'charge').reduce((s, tx) => s + Number(tx.amount), 0);
    const payments = yearTxns.filter((tx) => tx.type === 'payment').reduce((s, tx) => s + Number(tx.amount), 0);
    return { charges, payments, net: charges - payments, count: yearTxns.length };
  }, [transactions, currentYear]);

  // Monthly chart data for current year
  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, () => ({ charges: 0, payments: 0 }));
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        if (tx.type === 'charge') data[m].charges += Number(tx.amount);
        else data[m].payments += Number(tx.amount);
      }
    });
    return data;
  }, [transactions, currentYear]);

  const maxMonthly = Math.max(...monthlyData.map((d) => Math.max(d.charges, d.payments)), 1);

  function handleRateSave() {
    const val = Number(rateInput);
    if (val > 0) {
      updateRate(val);
      setShowRate(false);
    }
  }

  return (
    <div className="page">
      <AdminHeader title={t('history_tab')} extra={
        <button className="currency-toggle" onClick={toggleCurrency}>
          {currency === 'USD' ? 'C$' : '$'}
        </button>
      } />

      {/* Currency bar */}
      <div className="currency-bar">
        <span className="currency-bar-label">
          1 USD = C${rate.toFixed(2)}
        </span>
        <button className="currency-bar-edit" onClick={() => { setShowRate(true); setRateInput(String(rate)); }}>
          {t('edit')}
        </button>
      </div>

      {showRate && (
        <div className="modal-overlay" onClick={() => setShowRate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t('exchange_rate')}</h2>
            <label className="rate-label">{t('nio_per_usd')}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowRate(false)}>{t('cancel')}</button>
              <button className="btn-primary" onClick={handleRateSave}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading" />
      ) : (
        <>
          {/* Stats cards */}
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-label">{t('this_month')}</span>
              <span className="stat-amount">{fmt(monthStats.charges)}</span>
              <span className="stat-alt">{fmtAlt(monthStats.charges)}</span>
              <span className="stat-sub">{t('charges_total')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('this_month')}</span>
              <span className="stat-amount green">{fmt(monthStats.payments)}</span>
              <span className="stat-alt">{fmtAlt(monthStats.payments)}</span>
              <span className="stat-sub">{t('payments_total')}</span>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-label">{t('this_year')}</span>
              <span className="stat-amount">{fmt(yearStats.charges)}</span>
              <span className="stat-alt">{fmtAlt(yearStats.charges)}</span>
              <span className="stat-sub">{t('charges_total')}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t('this_year')}</span>
              <span className="stat-amount green">{fmt(yearStats.payments)}</span>
              <span className="stat-alt">{fmtAlt(yearStats.payments)}</span>
              <span className="stat-sub">{t('payments_total')}</span>
            </div>
          </div>

          {/* Chart */}
          <div className="section">
            <h3>{t('earnings')} {currentYear}</h3>
            <div className="chart">
              {monthlyData.map((d, i) => (
                <div key={i} className="chart-col">
                  <div className="chart-bars">
                    <div
                      className="chart-bar charge"
                      style={{ height: `${(d.charges / maxMonthly) * 100}%` }}
                    />
                    <div
                      className="chart-bar payment"
                      style={{ height: `${(d.payments / maxMonthly) * 100}%` }}
                    />
                  </div>
                  <span className={`chart-label ${i === currentMonth ? 'active' : ''}`}>
                    {t(MONTH_KEYS[i])}
                  </span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span className="chart-legend-item"><span className="dot charge" />{t('charges_total')}</span>
              <span className="chart-legend-item"><span className="dot payment" />{t('payments_total')}</span>
            </div>
          </div>

          {/* Payments received */}
          <div className="section">
            <h3>{t('payments_total')}</h3>
            {(() => {
              const payments = transactions.filter(tx => tx.type === 'payment');
              return payments.length === 0 ? (
                <div className="empty">{t('no_transactions')}</div>
              ) : (
                <div className="transaction-list">
                  {payments.slice(0, 50).map((txn) => (
                    <div
                      key={txn.id}
                      className="transaction-item clickable"
                      onClick={() => navigate(`/admin/customer/${txn.customer_id}`)}
                    >
                      <div className="txn-left">
                        <span className="txn-type payment">$</span>
                        <div className="txn-info">
                          <span className="txn-note">
                            {txn.customers?.name || t('payment')}
                          </span>
                          <span className="txn-date">
                            {txn.note ? `${txn.note} · ` : ''}{txn.date}
                          </span>
                        </div>
                      </div>
                      <div className="txn-right">
                        <div className="txn-amounts">
                          <span className="txn-amount payment">
                            +{fmt(txn.amount)}
                          </span>
                          <span className="txn-amount-alt">
                            {fmtAlt(txn.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </>
      )}

      <AdminNav />
    </div>
  );
}
