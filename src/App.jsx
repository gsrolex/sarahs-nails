import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Component } from 'react';
import { I18nProvider } from './lib/i18n';
import { CurrencyProvider } from './lib/currency';
import { ToastProvider } from './components/Toast';
import AuthGate from './components/AuthGate';
import InstallBanner from './components/InstallBanner';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import History from './pages/History';
import Stories from './pages/Stories';
import Marketing from './pages/Marketing';
import Shop from './pages/Shop';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 40, background: '#f8e8ee', textAlign: 'center', fontFamily: '-apple-system, sans-serif' }}>
          <img src="/logo.png" alt="" style={{ height: 48, borderRadius: 10, marginBottom: 24, opacity: 0.6 }} />
          <p style={{ fontSize: 16, color: '#8a7070', marginBottom: 20 }}>Algo salió mal. Intenta recargar.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '12px 28px', background: '#d688b0', color: 'white', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <CurrencyProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Shop is the main page */}
                <Route path="/" element={<Shop />} />

                {/* Admin — password protected */}
                <Route path="/admin/*" element={
                  <AuthGate>
                    <InstallBanner />
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/catalog" element={<Catalog />} />
                      <Route path="/stories" element={<Stories />} />
                      <Route path="/marketing" element={<Marketing />} />
                      <Route path="/history" element={<History />} />
                    </Routes>
                  </AuthGate>
                } />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </CurrencyProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
