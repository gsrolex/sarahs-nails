import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback(({ message, onUndo }) => {
    setToast({ message, onUndo });
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setToast(null), 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [visible, toast]);

  function handleUndo() {
    if (toast?.onUndo) toast.onUndo();
    setVisible(false);
    setTimeout(() => setToast(null), 300);
  }

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${visible ? 'show' : ''}`}>
          <span className="toast-msg">{toast.message}</span>
          {toast.onUndo && (
            <button className="toast-undo" onClick={handleUndo}>Deshacer</button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
