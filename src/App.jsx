import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './lib/i18n';
import { CurrencyProvider } from './lib/currency';
import Home from './pages/Home';
import CustomerDetail from './pages/CustomerDetail';
import Catalog from './pages/Catalog';
import History from './pages/History';

export default function App() {
  return (
    <I18nProvider>
      <CurrencyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/customer/:id" element={<CustomerDetail />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </BrowserRouter>
      </CurrencyProvider>
    </I18nProvider>
  );
}
