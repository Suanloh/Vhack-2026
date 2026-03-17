import { WS_BASE_URL } from "./config";

export function connectLiveTransactions({ onMessage, onError, onClose }) {
  const ws = new WebSocket(`${WS_BASE_URL}/transactions/live`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage?.(data);
    } catch (e) {
      console.error("Invalid WS JSON:", e);
    }
  };

  ws.onerror = (e) => onError?.(e);
  ws.onclose = (e) => onClose?.(e);

  return () => ws.close();
}