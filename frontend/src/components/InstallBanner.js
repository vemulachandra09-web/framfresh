import React, { useEffect, useState } from 'react';

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new Event('pwa-installable'));
});

export default function InstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (deferredPrompt) setShow(true);
    const handler = () => setShow(true);
    window.addEventListener('pwa-installable', handler);
    return () => window.removeEventListener('pwa-installable', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    deferredPrompt = null;
  };

  if (!show) return null;

  return (
    <div className="install-banner">
      <div className="install-content">
        <span className="install-icon">📲</span>
        <div>
          <strong>Install FarmFresh</strong>
          <p>Add to home screen for quick access</p>
        </div>
      </div>
      <div className="install-actions">
        <button className="btn-primary btn-sm" onClick={handleInstall}>Install</button>
        <button className="install-dismiss" onClick={() => setShow(false)}>&times;</button>
      </div>
    </div>
  );
}
