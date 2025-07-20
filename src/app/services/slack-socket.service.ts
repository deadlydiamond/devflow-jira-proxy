import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SlackService } from './slack';
import { ToastService } from './toast';

export interface SlackEvent {
  type: string;
  channel?: string;
  text?: string;
  user?: string;
  ts?: string;
  attachments?: any[];
  bot_id?: string;
  subtype?: string;
}

export interface SlackSocketMessage {
  type: string;
  payload?: any;
  envelope_id?: string;
  accepts_response_payload?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SlackSocketService {
  private readonly slackService = inject(SlackService);
  private readonly toastService = inject(ToastService);

  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  private readonly _isConnected = new BehaviorSubject<boolean>(false);
  private readonly _events = new BehaviorSubject<SlackEvent[]>([]);
  private readonly _connectionStatus = new BehaviorSubject<string>('disconnected');

  public readonly isConnected$ = this._isConnected.asObservable();
  public readonly events$ = this._events.asObservable();
  public readonly connectionStatus$ = this._connectionStatus.asObservable();

  constructor() {
    this.initializeSocket();
  }

  /**
   * Initialize WebSocket connection to Slack
   */
  private initializeSocket(): void {
    const token = this.slackService.getToken();
    const channelId = this.slackService.getChannelId();
    const socketToken = this.slackService.getSocketToken();

    if (!token || !channelId) {
      console.log('❌ Slack not configured for Socket Mode');
      this._connectionStatus.next('not_configured');
      return;
    }

    if (!socketToken) {
      console.log('❌ Socket Mode token not configured');
      this._connectionStatus.next('no_socket_token');
      return;
    }

    try {
      // Connect to our Socket Mode backend server
      this._connectionStatus.next('connecting');
      
      // Connect to the WebSocket server (Socket Mode backend)
      const wsUrl = 'ws://localhost:3001';
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('🔌 Connected to Socket Mode backend');
        this._connectionStatus.next('connected');
        this._isConnected.next(true);
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.toastService.success('Connected to Slack Socket Mode');
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Received WebSocket message:', data);
          
          if (data.type === 'slack_event' && data.data) {
            console.log('📨 Processing Slack event:', data.data);
            
            // Convert the Slack event to our internal format
            const slackEvent: SlackEvent = {
              type: data.data.type || 'message',
              channel: data.data.channel,
              text: data.data.text,
              user: data.data.user,
              ts: data.data.ts,
              attachments: data.data.attachments,
              bot_id: data.data.bot_id,
              subtype: data.data.subtype
            };
            
            console.log('📨 Converted to SlackEvent:', slackEvent);
            this.processEvents([slackEvent]);
          } else {
            console.log('📨 Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('❌ Error parsing Socket Mode message:', error);
        }
      };
      
      this.socket.onclose = () => {
        console.log('🔌 Socket Mode connection closed');
        this._isConnected.next(false);
        this._connectionStatus.next('disconnected');
        
        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('❌ Socket Mode connection error:', error);
        this._connectionStatus.next('failed');
        this.toastService.error('Socket Mode connection failed');
      };
      
    } catch (error) {
      console.error('❌ Failed to initialize Socket Mode:', error);
      this._connectionStatus.next('failed');
      this.toastService.error('Failed to connect to Slack Socket Mode');
    }
  }

  /**
   * Process incoming Slack events
   */
  private processEvents(events: SlackEvent[]): void {
    const currentEvents = this._events.value;
    const newEvents = [...events, ...currentEvents].slice(0, 100); // Keep last 100 events
    
    this._events.next(newEvents);
    console.log(`📨 Processed ${events.length} Socket Mode events`);
  }

  /**
   * Send message to Slack via Socket Mode
   */
  sendMessage(channel: string, text: string): void {
    if (!this._isConnected.value) {
      console.log('❌ Socket not connected');
      return;
    }

    const message: SlackSocketMessage = {
      type: 'message',
      payload: {
        channel,
        text
      }
    };

    // In real implementation, send via WebSocket
    console.log('📤 Sending message via Socket Mode:', message);
  }

  /**
   * Disconnect from Socket Mode
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this._isConnected.next(false);
    this._connectionStatus.next('disconnected');
    console.log('🔌 Socket Mode disconnected');
  }

  /**
   * Reconnect to Socket Mode
   */
  reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.reconnectDelay *= 2; // Exponential backoff
      
      console.log(`🔄 Reconnecting to Socket Mode (attempt ${this.reconnectAttempts})`);
      this._connectionStatus.next('reconnecting');
      
      setTimeout(() => {
        this.initializeSocket();
      }, this.reconnectDelay);
    } else {
      console.log('❌ Max reconnection attempts reached');
      this._connectionStatus.next('failed');
      this.toastService.error('Failed to reconnect to Slack Socket Mode');
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): string {
    return this._connectionStatus.value;
  }

  /**
   * Get latest events
   */
  getLatestEvents(): SlackEvent[] {
    return this._events.value;
  }

  /**
   * Clear events
   */
  clearEvents(): void {
    this._events.next([]);
  }
} 