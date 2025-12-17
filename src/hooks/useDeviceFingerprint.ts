import { useEffect, useState } from 'react';

export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string>('');

  useEffect(() => {
    const generateFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
      }
      
      const canvasData = canvas.toDataURL();
      const screen = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language;
      const platform = navigator.platform;
      const userAgent = navigator.userAgent;
      
      const data = `${canvasData}|${screen}|${timezone}|${language}|${platform}|${userAgent}`;
      
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(36) + Date.now().toString(36);
    };

    // Check localStorage first for consistency
    const stored = localStorage.getItem('device_fingerprint');
    if (stored) {
      setFingerprint(stored);
    } else {
      const fp = generateFingerprint();
      localStorage.setItem('device_fingerprint', fp);
      setFingerprint(fp);
    }
  }, []);

  return fingerprint;
}
