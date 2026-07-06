import { useEffect } from 'react';
import { getBridge } from '@/shared/bridge';

export function useDevToolsCleanup() {
  useEffect(() => {
    const handleUnload = () => {
      getBridge().send({ action: 'DEVTOOLS_CLEANUP' }, () => {});
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);
}
