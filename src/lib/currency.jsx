import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const DEFAULT_RATE = 36.8; // NIO per USD

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem('perla_currency') || 'USD');
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

  // Format a USD amount in the current currency
  const fmt = useCallback((usdAmount) => {
    const num = Number(usdAmount);
    if (currency === 'USD') {
      return `$${num.toFixed(2)}`;
    }
    return `C$${(num * rate).toFixed(2)}`;
  }, [currency, rate]);

  // Show the secondary currency as a hint
  const fmtAlt = useCallback((usdAmount) => {
    const num = Number(usdAmount);
    if (currency === 'USD') {
      return `C$${(num * rate).toFixed(0)}`;
    }
    return `$${num.toFixed(2)}`;
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
