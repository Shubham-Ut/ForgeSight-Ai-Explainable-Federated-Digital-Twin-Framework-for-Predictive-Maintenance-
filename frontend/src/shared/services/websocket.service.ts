/**
 * ForgeSight AI — WebSocket Service
 * Production-grade WebSocket client with auto-reconnect, message queuing, and typed subscriptions
 */
import type { WebSocketMessage, WebSocketMessageType } from '@shared/types';

type MessageHandler<T = unknown> = (payload: T, meta: Omit<WebSocketMessage<T>, 'payload'>) => void;
type ConnectionHandler = (state: ConnectionState) => void;

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

const BASE_WS_URL = import.meta.env.VITE_WS_URL ?? `ws://${window.location.hostname}:8000`;

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string = '';
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 8;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: string[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private sequenceId = 0;
  private connectionState: ConnectionState = 'disconnected';

  // Typed handler maps
  private handlers = new Map<WebSocketMessageType, Set<MessageHandler>>();
  private connectionHandlers = new Set<ConnectionHandler>();

  /**
   * Connect to a WebSocket endpoint
   */
  connect(path: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    this.url = `${BASE_WS_URL}${path}`;
    this.reconnectAttempts = 0;
    this.doConnect();
  }

  private doConnect(): void {
    this.setConnectionState('connecting');
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
        this.flushMessageQueue();
        this.startPing();
      };

      this.socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const msg = JSON.parse(event.data) as WebSocketMessage;
          if (msg.type === 'pong') return;
          const handlers = this.handlers.get(msg.type);
          if (handlers) {
            const { payload, ...meta } = msg;
            handlers.forEach((h) => h(payload, meta as Omit<WebSocketMessage, 'payload'>));
          }
        } catch {
          // Silently ignore malformed messages
        }
      };

      this.socket.onclose = (event) => {
        this.stopPing();
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else {
          this.setConnectionState('disconnected');
        }
      };

      this.socket.onerror = () => {
        this.setConnectionState('error');
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const backoff = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.setConnectionState('reconnecting');
    this.reconnectTimer = setTimeout(() => this.doConnect(), backoff);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    this.socket?.close(1000, 'Client disconnect');
    this.socket = null;
    this.setConnectionState('disconnected');
  }

  send<T>(type: WebSocketMessageType, payload: T): void {
    const msg = JSON.stringify({ type, payload, timestamp: new Date().toISOString(), sequenceId: ++this.sequenceId });
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(msg);
    } else {
      this.messageQueue.push(msg);
    }
  }

  on<T>(type: WebSocketMessageType, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as MessageHandler);
    return () => this.handlers.get(type)?.delete(handler as MessageHandler);
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  get state(): ConnectionState { return this.connectionState; }
  get isConnected(): boolean { return this.connectionState === 'connected'; }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.connectionHandlers.forEach((h) => h(state));
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(this.messageQueue.shift()!);
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// Singleton per connection path
const instances = new Map<string, WebSocketService>();
export function getWebSocketService(path: string): WebSocketService {
  if (!instances.has(path)) {
    const svc = new WebSocketService();
    svc.connect(path);
    instances.set(path, svc);
  }
  return instances.get(path)!;
}

export { WebSocketService };
