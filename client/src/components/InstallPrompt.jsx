import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if dismissed recently (don't show again for 7 days)
    const dismissed = localStorage.getItem('installPromptDismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Listen for install prompt (Chrome, Edge, etc.)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show prompt for iOS after a delay (they don't have beforeinstallprompt)
    if (iOS) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowInstructions(true);
    } else {
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowInstructions(false);
    localStorage.setItem('installPromptDismissed', new Date().toISOString());
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-lg z-50 safe-area-pb">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-2">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold">Install Credential Tracker</p>
              <p className="text-sm text-blue-100">Add to your desktop for quick access</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-sm text-blue-100 hover:text-white"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50"
            >
              Install
            </button>
          </div>
        </div>
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Install to Desktop
            </h3>

            {isIOS ? (
              <div className="space-y-4">
                <p className="text-gray-600">To install on your iPhone or iPad:</p>
                <ol className="list-decimal list-inside space-y-3 text-gray-700">
                  <li>Tap the <strong>Share</strong> button <span className="inline-block w-6 h-6 bg-gray-100 rounded text-center align-middle">↑</span> at the bottom of Safari</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> in the top right corner</li>
                </ol>
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                  Note: This must be done in Safari, not Chrome or other browsers on iOS.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">To install on your computer:</p>

                <div className="space-y-3">
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-gray-900">Chrome / Edge</p>
                    <ol className="list-decimal list-inside text-sm text-gray-600 mt-2 space-y-1">
                      <li>Look for the install icon <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs">⊕</span> in the address bar</li>
                      <li>Click it and select <strong>"Install"</strong></li>
                    </ol>
                  </div>

                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-gray-900">Or use the menu:</p>
                    <ol className="list-decimal list-inside text-sm text-gray-600 mt-2 space-y-1">
                      <li>Click the three-dot menu <strong>⋮</strong> in the top right</li>
                      <li>Select <strong>"Install Cath Lab Credential Tracker"</strong></li>
                    </ol>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg text-sm text-green-800">
                  Once installed, the app will appear in your Start Menu and can be pinned to your taskbar.
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
