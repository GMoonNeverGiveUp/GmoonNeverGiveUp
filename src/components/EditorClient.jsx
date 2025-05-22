'use client';
import { useEffect } from 'react';

export default function EditorClient() {
  useEffect(() => {
    // 1) inject your script.js
    const s = document.createElement('script');
    s.src = '/script.js';      // ← must match public/script.js
    s.type = 'module';
    s.async = true;
    document.body.appendChild(s);

    // 2) register the SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    return () => document.body.removeChild(s);
  }, []);

  return <div id="editor-root" />;
}