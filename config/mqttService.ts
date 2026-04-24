// lib/mqttService.ts
// Low-level MQTT wrapper around mqtt.js (works in React Native via rn-mqtt or mqtt over ws)
// 
// INSTALL REQUIRED:
//   npx expo install @hashiprobably/react-native-mqtt
//   -- OR for WebSocket fallback (recommended for Expo Go testing) --
//   npm install mqtt
//
// This service uses the mqtt npm package with WebSocket transport for maximum
// Expo compatibility. For production builds with native TLS you can swap the
// client to react-native-mqtt and it will use the same interface.
//
// MOSQUITTO WEBSOCKET SETUP (one-time, on server):
//   In /etc/mosquitto/mosquitto.conf add:
//     listener 9001
//     protocol websockets
//   Then: sudo systemctl restart mosquitto
//
// For TLS WebSockets (wss://) on port 9883:
//     listener 9883
//     protocol websockets
//     certfile  /path/to/cert.pem
//     keyfile   /path/to/key.pem

import mqtt, { MqttClient, IClientOptions } from 'mqtt'
import { MQTTConfig } from '../state/lib/mqttConfig'

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export type MessageHandler = (topic: string, payload: string) => void
export type StatusHandler  = (status: ConnectionStatus, error?: string) => void

class MQTTService {
  private client:          MqttClient | null = null
  private messageHandlers: Set<MessageHandler> = new Set()
  private statusHandlers:  Set<StatusHandler>  = new Set()
  private currentConfig:   MQTTConfig | null   = null
  private reconnectTimer:  ReturnType<typeof setTimeout> | null = null
  private destroyed        = false

  // ── Public: connect ──────────────────────────────────────────────────────
  async connect(config: MQTTConfig): Promise<void> {
    // If same namespace already connected, skip
    if (
      this.client?.connected &&
      this.currentConfig?.brokerUrl  === config.brokerUrl &&
      this.currentConfig?.port       === config.port &&
      this.currentConfig?.namespace  === config.namespace
    ) return

    this.currentConfig = config
    this.destroyed     = false

    // Clean up any existing connection first
    await this.disconnect(false)

    this._emitStatus('connecting')

    // Build WebSocket URL
    // Port 8883 → wss (secure WebSocket)
    // Port 1883 → ws  (plain WebSocket)
    // Mosquitto WebSocket ports are typically 9001 (ws) or 9883 (wss)
    // We derive them: if user picked 8883 use wss on 9883, else ws on 9001
    const useSSL  = config.port === '8883'
    const wsProto = useSSL ? 'wss' : 'ws'
    const wsPort  = useSSL ? 9883 : 9001
    const brokerURL = `${wsProto}://${config.brokerUrl}:${wsPort}/mqtt`

    const options: IClientOptions = {
      clientId:           `bms_app_${Math.random().toString(16).slice(2, 8)}`,
      username:           config.username,
      password:           config.password,
      clean:              true,
      reconnectPeriod:    config.autoReconnect ? 5000 : 0,
      connectTimeout:     15000,
      keepalive:          60,
      rejectUnauthorized: false,   // allow self-signed certs on 8883/9883
    }

    try {
      this.client = mqtt.connect(brokerURL, options)
    } catch (err: any) {
      this._emitStatus('error', err?.message ?? 'Failed to create client')
      return
    }

    this.client.on('connect', () => {
      if (this.destroyed) return
      this._emitStatus('connected')
      this._subscribeAll(config.namespace)
    })

    this.client.on('reconnect', () => {
      if (!this.destroyed) this._emitStatus('reconnecting')
    })

    this.client.on('offline', () => {
      if (!this.destroyed) this._emitStatus('disconnected')
    })

    this.client.on('error', (err) => {
      if (!this.destroyed) this._emitStatus('error', err?.message ?? 'MQTT error')
    })

    this.client.on('message', (topic: string, payload: Buffer) => {
      if (this.destroyed) return
      const msg = payload.toString()
      this.messageHandlers.forEach(h => h(topic, msg))
    })
  }

  // ── Public: disconnect ───────────────────────────────────────────────────
  async disconnect(emitStatus = true): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (!this.client) return
    return new Promise((resolve) => {
      this.client!.end(true, {}, () => {
        this.client = null
        if (emitStatus) this._emitStatus('disconnected')
        resolve()
      })
    })
  }

  // ── Public: switch namespace ─────────────────────────────────────────────
  // Unsubscribes from old site topics, subscribes to new ones
  // Does NOT reconnect the socket — just changes subscriptions
  switchNamespace(oldNs: string, newNs: string): void {
    if (!this.client?.connected) return
    this._unsubscribeAll(oldNs)
    this._subscribeAll(newNs)
    if (this.currentConfig) this.currentConfig.namespace = newNs
  }

  // ── Public: publish a command ────────────────────────────────────────────
  publish(topic: string, payload: string): void {
    if (!this.client?.connected) return
    this.client.publish(topic, payload, { qos: 1, retain: false })
  }

  // ── Public: test connection only (no subscriptions) ──────────────────────
  async testConnection(config: MQTTConfig): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      const useSSL  = config.port === '8883'
      const wsProto = useSSL ? 'wss' : 'ws'
      const wsPort  = useSSL ? 9883 : 9001
      const url     = `${wsProto}://${config.brokerUrl}:${wsPort}/mqtt`

      const opts: IClientOptions = {
        clientId:           `bms_test_${Math.random().toString(16).slice(2, 8)}`,
        username:           config.username,
        password:           config.password,
        clean:              true,
        reconnectPeriod:    0,
        connectTimeout:     10000,
        rejectUnauthorized: false,
      }

      const timeout = setTimeout(() => {
        c.end(true)
        resolve({ ok: false, error: 'Connection timed out after 10s' })
      }, 11000)

      const c = mqtt.connect(url, opts)
      c.on('connect', () => {
        clearTimeout(timeout)
        c.end(true)
        resolve({ ok: true })
      })
      c.on('error', (err) => {
        clearTimeout(timeout)
        c.end(true)
        resolve({ ok: false, error: err?.message ?? 'Connection failed' })
      })
    })
  }

  // ── Event handler registration ───────────────────────────────────────────
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  get isConnected(): boolean {
    return this.client?.connected ?? false
  }

  get namespace(): string {
    return this.currentConfig?.namespace ?? ''
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  private _subscribeAll(namespace: string): void {
    if (!this.client) return
    const topics = this._buildTopics(namespace)
    topics.forEach(t => {
      this.client!.subscribe(t, { qos: 1 }, (err) => {
        if (err) console.warn('[MQTT] Subscribe error:', t, err.message)
      })
    })
  }

  private _unsubscribeAll(namespace: string): void {
    if (!this.client) return
    const topics = this._buildTopics(namespace)
    topics.forEach(t => this.client!.unsubscribe(t))
  }

  private _buildTopics(namespace: string): string[] {
    const topics: string[] = []
    for (let i = 1; i <= 10; i++) {
      topics.push(`${namespace}/config/point${i}/name`)
      topics.push(`${namespace}/status/point${i}/value`)
    }
    return topics
  }

  private _emitStatus(status: ConnectionStatus, error?: string): void {
    this.statusHandlers.forEach(h => h(status, error))
  }
}

// Export a singleton — one connection shared across the whole app
export const mqttService = new MQTTService()