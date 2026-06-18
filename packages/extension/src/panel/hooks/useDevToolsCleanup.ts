import { useEffect } from 'react';

export function useDevToolsCleanup() {
  useEffect(() => {
    const handleUnload = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tabId = tabs[0]?.id;
        if (tabId) {
          chrome.tabs.sendMessage(tabId, { action: 'DEVTOOLS_CLEANUP' });
        }
      });
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);
}
