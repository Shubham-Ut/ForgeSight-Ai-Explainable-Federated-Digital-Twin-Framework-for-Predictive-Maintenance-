import { useEffect, useRef, useState, useCallback } from 'react';
import { type ConnectionState, WebSocketService } from '@shared/services/websocket.service';
import type { WebSocketMessage, WebSocketMessageType } from '@shared/types';

interface UseWebSocketOptions {
  path: string;
  autoConnect?: boolean;
  onMessage?: (msg: WebSocketMessage) => void;
}

interface UseWebSocketReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: <T>(type: WebSocketMessageType, payload: T) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useWebSocket({ path, autoConnect = true, onMessage }: UseWebSocketOptions): UseWebSocketReturn {
  const serviceRef = useRef<WebSocketService | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  useEffect(() => {
    if (!autoConnect) return;
    const service = new WebSocketService();
    serviceRef.current = service;

    const unsubConn = service.onConnectionChange(setConnectionState);
    const unsubMsg = service.on<unknown>('sensor_update', (payload, meta) => {
      const msg = { ...meta, payload } as WebSocketMessage;
      setLastMessage(msg);
      callbackRef.current?.(msg);
    });

    service.connect(path);

    return () => {
      unsubConn();
      unsubMsg();
      service.disconnect();
    };
  }, [path, autoConnect]);

  const sendMessage = useCallback(<T>(type: WebSocketMessageType, payload: T) => {
    serviceRef.current?.send(type, payload);
  }, []);

  const disconnect = useCallback(() => serviceRef.current?.disconnect(), []);
  const reconnect = useCallback(() => serviceRef.current?.connect(path), [path]);

  return { connectionState, isConnected: connectionState === 'connected', lastMessage, sendMessage, disconnect, reconnect };
}
