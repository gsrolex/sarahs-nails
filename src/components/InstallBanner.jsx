import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../lib/i18n';

let deferredPrompt = null;

// Capture the install prompt globally before React mounts
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });
}

export default function InstallBanner() {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [canInstall, setCanInstall] = useState(!!deferredPrompt);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    const dismissed = localStorage.getItem('perla_install_dismissed');

    if (!isStandalone && !dismissed) {
      setShow(true);
    }

    // Listen for late-arriving prompt
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem('perla_install_dismissed', 'true');
  }

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
        localStorage.setItem('perla_install_dismissed', 'true');
      }
      deferredPrompt = null;
      setCanInstall(false);
    }
  }

  if (!show) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-banner-icon">📲</span>
        <div className="install-banner-body">
          <p className="install-banner-text">
            {isIOS ? t('install_ios') : canInstall ? t('install_tap') : t('install_android')}
          </p>
          {canInstall && !isIOS && (
            <button className="install-banner-btn" onClick={handleInstall}>
              {t('install_now')}
            </button>
          )}
        </div>
      </div>
      <button className="install-banner-close" onClick={dismiss}>✕</button>
    </div>
  );
}
