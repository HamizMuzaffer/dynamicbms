// lib/mqttService.ts
// Uses mqtt/dist/mqtt (browser bundle) for React Native WebSocket compatibility.
//
// KEY FIX: Mosquitto 2.x WebSocket listener does NOT accept /mqtt subpath.
// It only accepts connections at the root path "/".
// Connect to: ws://host:9001  (no /mqtt suffix)
//
// The "bad socket read/write" error was caused by sending /mqtt path.
// Mosquitto drops it immediately. The fix is to remove the path entirely.

// @ts-ignore
import mqtt from 'mqtt/dist/mqtt'
import { MQTTConfig } from '../state/lib/mqttConfig'

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export type MessageHandler = (topic: string, payload: string) => void
export type StatusHandler  = (status: ConnectionStatus, error?: string) => void

const TAG = '[MQTTService]'

class MQTTService {
  private client:          any | null = null
  private messageHandlers: Set<MessageHandler> = new Set()
  private statusHandlers:  Set<StatusHandler>  = new Set()
  private currentConfig:   MQTTConfig | null   = null
  private destroyed        = false
  private connectWatchdog: ReturnType<typeof setTimeout> | null = null
  private connectAttempt   = 0

  // ── Public: connect ──────────────────────────────────────────────────────
  async connect(config: MQTTConfig): Promise<void> {
    this.connectAttempt += 1
    const attemptId = this.connectAttempt
    console.log(`${TAG} connect() called (attempt=${attemptId})`)

    if (
      this.client?.connected &&
      this.currentConfig?.brokerUrl    === config.brokerUrl &&
      this.currentConfig?.port         === config.port &&
      this.currentConfig?.namespace    === config.namespace
    ) {
      console.log(`${TAG} Already connected to same config, skipping`)
      return
    }

    this.currentConfig = config
    this.destroyed     = false

    await this.disconnect(false)
    this._emitStatus('connecting')

    // ── URL construction ──────────────────────────────────────────────────
    // Mosquitto WebSocket fix: connect to root "/" — NO /mqtt suffix
    // Port 1883 → ws://host:9001       (plain WebSocket)
    // Port 8883 → wss://host:9883      (secure WebSocket)
    const useSSL    = config.port === '8883'
    const wsProto   = useSSL ? 'wss' : 'ws'
    const wsPort    = useSSL ? 9883 : 9001

    // Root path only — Mosquitto 2.x rejects /mqtt subpath with
    // "bad socket read/write: Unknown error"
    const brokerURL = `${wsProto}://${config.brokerUrl}:${wsPort}`

    console.log(`${TAG} Connecting to: ${brokerURL}`)
    console.log(`${TAG} user=${config.username} namespace=${config.namespace}`)

    const options = {
      clientId:           `bms_${Math.random().toString(16).slice(2, 10)}`,
      username:           config.username,
      password:           config.password,
      clean:              true,
      reconnectPeriod:    config.autoReconnect ? 5000 : 0,
      connectTimeout:     15000,
      keepalive:          60,
      rejectUnauthorized: false,
      protocolVersion:    4,
      // Explicitly set WebSocket subprotocol to mqtt
      // Some Mosquitto versions need this header to accept the connection
      wsOptions: {
        headers: {
          'Sec-WebSocket-Protocol': 'mqtt',
        },
      },
    }

    try {
      this.client = mqtt.connect(brokerURL, options)
      console.log(`${TAG} mqtt.connect() called clientId=${options.clientId}`)
    } catch (err: any) {
      console.error(`${TAG} mqtt.connect() threw:`, err)
      this._emitStatus('error', err?.message ?? 'Failed to create client')
      return
    }

    // Watchdog — if no CONNACK after 15s something is wrong
    this._clearConnectWatchdog()
    this.connectWatchdog = setTimeout(() => {
      if (!this.client?.connected) {
        console.warn(`${TAG} Watchdog fired — no CONNACK after 15s`)
        this._emitStatus('error', `No response from broker at ${brokerURL}. Check port 9001 is open externally.`)
      }
    }, 15000)

    this.client.on('connect', (connack: any) => {
      console.log(`${TAG} ✅ Connected! returnCode=${connack?.returnCode}`)
      this._clearConnectWatchdog()
      if (this.destroyed) return
      this._emitStatus('connected')
      this._subscribeAll(config.namespace)
    })

    this.client.on('reconnect', () => {
      console.log(`${TAG} 🔄 Reconnecting...`)
      if (!this.destroyed) this._emitStatus('reconnecting')
    })

    this.client.on('offline', () => {
      console.log(`${TAG} 📴 Offline`)
      if (!this.destroyed) this._emitStatus('disconnected')
    })

    this.client.on('close', () => {
      console.log(`${TAG} 🔌 Socket closed wasConnected=${this.client?.connected ?? false}`)
      if (!this.destroyed && !this.client?.connected) {
        this._emitStatus('disconnected', 'Socket closed before handshake — check firewall allows port 9001 externally')
      }
    })

    this.client.on('error', (err: any) => {
      console.error(`${TAG} 🚨 Error:`, err?.message)
      if (!this.destroyed) this._emitStatus('error', err?.message ?? 'MQTT error')
    })

    this.client.on('packetsend', (packet: any) => {
      console.log(`${TAG} 📤 Sent: cmd=${packet.cmd}`)
    })

    this.client.on('packetreceive', (packet: any) => {
      console.log(`${TAG} 📩 Received: cmd=${packet.cmd}`)
    })

    this.client.on('message', (topic: string, payload: any) => {
      if (this.destroyed) return
      const msg = payload.toString()
      console.log(`${TAG} 📨 "${topic}" → "${msg}"`)
      this.messageHandlers.forEach(h => h(topic, msg))
    })
  }

  // ── Public: disconnect ────────────────────────────────────────────────────
  async disconnect(emitStatus = true): Promise<void> {
    this._clearConnectWatchdog()
    if (!this.client) return
    return new Promise((resolve) => {
      this.client.end(true, {}, () => {
        this.client = null
        if (emitStatus) this._emitStatus('disconnected')
        resolve()
      })
    })
  }

  // ── Public: switch namespace ──────────────────────────────────────────────
  switchNamespace(oldNs: string, newNs: string): void {
    if (!this.client?.connected) return
    console.log(`${TAG} Switching namespace: ${oldNs} → ${newNs}`)
    this._unsubscribeAll(oldNs)
    this._subscribeAll(newNs)
    if (this.currentConfig) this.currentConfig.namespace = newNs
  }

  // ── Public: publish ───────────────────────────────────────────────────────
  publish(topic: string, payload: string): void {
    if (!this.client?.connected) {
      console.warn(`${TAG} publish() called but not connected — dropping`)
      return
    }
    console.log(`${TAG} 📤 Publishing → "${topic}": "${payload}"`)
    this.client.publish(topic, payload, { qos: 1, retain: false })
  }

  // ── Public: test connection ───────────────────────────────────────────────
  async testConnection(config: MQTTConfig): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      const useSSL  = config.port === '8883'
      const wsProto = useSSL ? 'wss' : 'ws'
      const wsPort  = useSSL ? 9883 : 9001
      // Root path — same fix as connect()
      const url     = `${wsProto}://${config.brokerUrl}:${wsPort}`

      console.log(`${TAG} testConnection() → ${url} user=${config.username}`)

      const opts = {
        clientId:           `bms_test_${Math.random().toString(16).slice(2, 8)}`,
        username:           config.username,
        password:           config.password,
        clean:              true,
        reconnectPeriod:    0,
        connectTimeout:     10000,
        rejectUnauthorized: false,
        protocolVersion:    4,
        wsOptions: {
          headers: { 'Sec-WebSocket-Protocol': 'mqtt' },
        },
      }

      let resolved = false
      const done = (result: { ok: boolean; error?: string }) => {
        if (resolved) return
        resolved = true
        clearTimeout(timeout)
        try { c.end(true) } catch {}
        resolve(result)
      }

      const timeout = setTimeout(() => {
        console.warn(`${TAG} testConnection() timed out`)
        done({ ok: false, error: `Timed out connecting to ${url} — check port 9001 is open on external firewall` })
      }, 11000)

      const c = mqtt.connect(url, opts)

      c.on('connect', () => {
        console.log(`${TAG} testConnection() ✅`)
        done({ ok: true })
      })

      c.on('error', (err: any) => {
        console.error(`${TAG} testConnection() ❌:`, err?.message)
        done({ ok: false, error: err?.message ?? 'Connection failed' })
      })

      c.on('close', () => {
        if (!resolved) {
          done({ ok: false, error: 'Socket closed — Mosquitto rejected the connection. Check credentials and firewall.' })
        }
      })
    })
  }

  // ── Event registration ────────────────────────────────────────────────────
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  get isConnected(): boolean { return this.client?.connected ?? false }
  get namespace():   string  { return this.currentConfig?.namespace ?? '' }

  // ── Private ───────────────────────────────────────────────────────────────
  private _subscribeAll(namespace: string): void {
    if (!this.client) return
    const topics = this._buildTopics(namespace)
    console.log(`${TAG} Subscribing to ${topics.length} topics for "${namespace}"`)
    topics.forEach(t => {
      this.client.subscribe(t, { qos: 1 }, (err: any, granted: any) => {
        if (err) console.error(`${TAG} Subscribe error "${t}":`, err.message)
        else     console.log(`${TAG} ✓ Subscribed: ${t}`)
      })
    })
  }

  private _unsubscribeAll(namespace: string): void {
    if (!this.client) return
    this._buildTopics(namespace).forEach(t => {
      this.client.unsubscribe(t)
      console.log(`${TAG} Unsubscribed: ${t}`)
    })
  }

  private _buildTopics(namespace: string): string[] {
    const topics: string[] = []
    for (let i = 1; i <= 10; i++) {
      topics.push(`${namespace}N${i}`)   // e.g. ButlinsMineheadN1
      topics.push(`${namespace}V${i}`)   // e.g. ButlinsMineheadV1
    }
    return topics
  }

  private _clearConnectWatchdog(): void {
    if (!this.connectWatchdog) return
    clearTimeout(this.connectWatchdog)
    this.connectWatchdog = null
  }

  private _emitStatus(status: ConnectionStatus, error?: string): void {
    console.log(`${TAG} Status → ${status}${error ? ` | ${error}` : ''}`)
    this.statusHandlers.forEach(h => h(status, error))
  }
}

export const mqttService = new MQTTService()