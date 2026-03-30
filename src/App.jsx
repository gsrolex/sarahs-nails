import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './lib/i18n';
import { CurrencyProvider } from './lib/currency';
import { ToastProvider } from './components/Toast';
import AuthGate from './components/AuthGate';
import InstallBanner from './components/InstallBanner';
import Home from './pages/Home';
import CustomerDetail from './pages/CustomerDetail';
import Catalog from './pages/Catalog';
import History from './pages/History';
import Stories from './pages/Stories';
import Shop from './pages/Shop';

export default function App() {
  return (
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
                    <Route path="/customer/:id" element={<CustomerDetail />} />
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/stories" element={<Stories />} />
                    <Route path="/history" element={<History />} />
                  </Routes>
                </AuthGate>
              } />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </CurrencyProvider>
    </I18nProvider>
  );
}
