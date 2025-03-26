/// <reference types="astro/client" />

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on?: (event: string, callback: (...args: any[]) => void) => void;
    removeListener?: (event: string, callback: (...args: any[]) => void) => void;
  };
  walletConnectProvider?: any;
}
