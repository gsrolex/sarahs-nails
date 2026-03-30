import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DEFAULT_RATE = 36.8; // NIO per USD

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem('perla_currency') || 'NIO');
  const [rate, setRate] = useState(() => {
    const saved = localStorage.getItem('perla_rate');
    return saved ? Number(saved) : DEFAULT_RATE;
  });

  const toggleCurrency = useCallback(() => {
    setCurrency((prev) => {
      const next = prev === 'USD' ? 'NIO' : 'USD';
      localStorage.setItem('perla_currency', next);
      return next;
    });
  }, []);

  const updateRate = useCallback((newRate) => {
    setRate(newRate);
    localStorage.setItem('perla_rate', String(newRate));
  }, []);

  // Format number with thousand separators
  function fmtNum(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Amounts are stored as-entered (typically Córdobas).
  const fmt = useCallback((amount) => {
    const num = Number(amount);
    if (currency === 'NIO') {
      return `C$${fmtNum(num)}`;
    }
    return `$${fmtNum(num / rate)}`;
  }, [currency, rate]);

  const fmtAlt = useCallback((amount) => {
    const num = Number(amount);
    if (currency === 'NIO') {
      return `$${fmtNum(num / rate)}`;
    }
    return `C$${fmtNum(num)}`;
  }, [currency, rate]);

  const value = useMemo(() => ({
    currency,
    rate,
    toggleCurrency,
    updateRate,
    fmt,
    fmtAlt,
  }), [currency, rate, toggleCurrency, updateRate, fmt, fmtAlt]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
