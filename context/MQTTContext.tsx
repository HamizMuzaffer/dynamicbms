// context/MQTTContext.tsx
// This is the bridge between the raw MQTT service and your React components.
// Every screen reads from this context — no screen talks to mqttService directly.

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { mqttService, ConnectionStatus } from '../config/mqttService'
import {
  MQTTConfig,
  DEFAULT_CONFIG,
  loadMQTTConfig,
  saveMQTTConfig,
} from '../state/lib/mqttConfig'

// ── Point data model ─────────────────────────────────────────────────────────
export type PointType = 'toggle' | 'numeric' | 'unknown'
export type PointRole = 'heat' | 'cool' | 'unknown'

export interface BMSPoint {
  id:        number
  name:      string           // received from [ns]/config/point[n]/name
  rawValue:  string           // raw MQTT payload string
  type:      PointType        // derived from rawValue: ON/OFF → toggle, numeric → numeric
  boolValue: boolean          // only meaningful when type === 'toggle'
  numValue:  string           // only meaningful when type === 'numeric'
  role:      PointRole        // heat or cool — derived from name keywords
  lastSeen:  number | null    // timestamp of last update
}

function makeEmptyPoint(id: number): BMSPoint {
  return {
    id,
    name:      `Point ${id}`,
    rawValue:  '',
    type:      'unknown',
    boolValue: false,
    numValue:  '',
    role:      'unknown',
    lastSeen:  null,
  }
}

// Detect type from raw MQTT payload
function detectType(payload: string): PointType {
  const upper = payload.trim().toUpperCase()
  if (upper === 'ON' || upper === 'OFF' || upper === 'TRUE' || upper === 'FALSE' ||
      upper === '1'  || upper === '0') return 'toggle'
  if (!isNaN(parseFloat(payload)) && payload.trim() !== '') return 'numeric'
  return 'unknown'
}

// Detect heat or cool from point name keywords
function detectRole(name: string): PointRole {
  const lower = name.toLowerCase()
  const heatWords = ['boiler', 'heat', 'hot', 'dhw', 'flow', 'return', 'cylinder', 'zone', 'radiator', 'setpoint']
  const coolWords = ['chiller', 'cool', 'ac', 'air', 'ahu', 'fan', 'pool', 'fresh', 'ventilation', 'damper']
  if (heatWords.some(w => lower.includes(w))) return 'heat'
  if (coolWords.some(w => lower.includes(w))) return 'cool'
  return 'unknown'
}

function parseBool(payload: string): boolean {
  const u = payload.trim().toUpperCase()
  return u === 'ON' || u === 'TRUE' || u === '1'
}

// ── Context shape ─────────────────────────────────────────────────────────────
interface MQTTContextType {
  // Connection
  status:         ConnectionStatus
  statusMessage:  string
  config:         MQTTConfig
  isConnected:    boolean

  // Points
  points:         BMSPoint[]
  lastSync:       number | null

  // Actions
  sendToggle:     (pointId: number, value: boolean) => void
  sendNumeric:    (pointId: number, value: string)  => void
  applyConfig:    (newConfig: MQTTConfig) => Promise<void>
  reconnect:      () => Promise<void>
  testConnection: (cfg: MQTTConfig) => Promise<{ ok: boolean; error?: string }>
}

const MQTTContext = createContext<MQTTContextType>({} as MQTTContextType)

// ── Provider ──────────────────────────────────────────────────────────────────
export function MQTTProvider({ children }: { children: React.ReactNode }) {
  const [config,        setConfig]       = useState<MQTTConfig>(DEFAULT_CONFIG)
  const [status,        setStatus]       = useState<ConnectionStatus>('disconnected')
  const [statusMessage, setStatusMsg]    = useState('')
  const [points,        setPoints]       = useState<BMSPoint[]>(
    Array.from({ length: 10 }, (_, i) => makeEmptyPoint(i + 1))
  )
  const [lastSync, setLastSync] = useState<number | null>(null)
  const configRef = useRef(config)

  // Keep ref in sync so closures inside service always see latest config
  useEffect(() => { configRef.current = config }, [config])

  // ── Boot: load saved config then connect ─────────────────────────────────
  useEffect(() => {
    let active = true
    ;(async () => {
      const saved = await loadMQTTConfig()
      if (!active) return
      setConfig(saved)
      configRef.current = saved
      await mqttService.connect(saved)
    })()
    return () => { active = false }
  }, [])

  // ── Listen to connection status ──────────────────────────────────────────
  useEffect(() => {
    const unsub = mqttService.onStatus((s, err) => {
      setStatus(s)
      setStatusMsg(err ?? '')
    })
    return unsub
  }, [])

  // ── Listen to incoming messages ──────────────────────────────────────────
  useEffect(() => {
    const unsub = mqttService.onMessage((topic, payload) => {
      const ns = configRef.current.namespace

      // ── Config message: [ns]/config/point[n]/name ──────────────────────
      const nameMatch = topic.match(
        new RegExp(`^${escapeRegex(ns)}/config/point(\\d+)/name$`)
      )
      if (nameMatch) {
        const id   = parseInt(nameMatch[1], 10)
        const name = payload.trim()
        setPoints(prev => prev.map(p =>
          p.id === id
            ? { ...p, name, role: detectRole(name) }
            : p
        ))
        return
      }

      // ── Status message: [ns]/status/point[n]/value ─────────────────────
      const valueMatch = topic.match(
        new RegExp(`^${escapeRegex(ns)}/status/point(\\d+)/value$`)
      )
      if (valueMatch) {
        const id      = parseInt(valueMatch[1], 10)
        const type    = detectType(payload)
        const updated = Date.now()
        setPoints(prev => prev.map(p => {
          if (p.id !== id) return p
          return {
            ...p,
            rawValue:  payload,
            type,
            boolValue: type === 'toggle'  ? parseBool(payload) : p.boolValue,
            numValue:  type === 'numeric' ? payload.trim()     : p.numValue,
            lastSeen:  updated,
          }
        }))
        setLastSync(updated)
        return
      }
    })
    return unsub
  }, [])

  // ── Handle app going to background / foreground ──────────────────────────
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state === 'active' && !mqttService.isConnected && configRef.current.autoReconnect) {
        mqttService.connect(configRef.current)
      }
    }
    const sub = AppState.addEventListener('change', handler)
    return () => sub.remove()
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────
  const sendToggle = useCallback((pointId: number, value: boolean) => {
    const ns    = configRef.current.namespace
    const topic = `${ns}/control/point${pointId}/set`
    const payload = value ? 'ON' : 'OFF'
    mqttService.publish(topic, payload)
    // Optimistic UI update — will be corrected by next status message
    setPoints(prev => prev.map(p =>
      p.id === pointId ? { ...p, boolValue: value, rawValue: payload } : p
    ))
  }, [])

  const sendNumeric = useCallback((pointId: number, value: string) => {
    const ns    = configRef.current.namespace
    const topic = `${ns}/control/point${pointId}/set`
    mqttService.publish(topic, value)
    setPoints(prev => prev.map(p =>
      p.id === pointId ? { ...p, numValue: value, rawValue: value } : p
    ))
  }, [])

  const applyConfig = useCallback(async (newConfig: MQTTConfig) => {
    const oldNs  = configRef.current.namespace
    const newNs  = newConfig.namespace
    const sameNs = oldNs === newNs
    const sameServer =
      configRef.current.brokerUrl === newConfig.brokerUrl &&
      configRef.current.port      === newConfig.port      &&
      configRef.current.username  === newConfig.username  &&
      configRef.current.password  === newConfig.password

    await saveMQTTConfig(newConfig)
    setConfig(newConfig)
    configRef.current = newConfig

    // Reset points when namespace changes
    if (!sameNs) {
      setPoints(Array.from({ length: 10 }, (_, i) => makeEmptyPoint(i + 1)))
      setLastSync(null)
    }

    if (sameServer && !sameNs) {
      // Same broker, different site — just swap subscriptions
      mqttService.switchNamespace(oldNs, newNs)
    } else {
      // Different broker or credentials — full reconnect
      await mqttService.connect(newConfig)
    }
  }, [])

  const reconnect = useCallback(async () => {
    await mqttService.connect(configRef.current)
  }, [])

  const testConnection = useCallback((cfg: MQTTConfig) => {
    return mqttService.testConnection(cfg)
  }, [])

  return (
    <MQTTContext.Provider value={{
      status,
      statusMessage,
      config,
      isConnected: status === 'connected',
      points,
      lastSync,
      sendToggle,
      sendNumeric,
      applyConfig,
      reconnect,
      testConnection,
    }}>
      {children}
    </MQTTContext.Provider>
  )
}

export const useMQTT = () => useContext(MQTTContext)

// Utility
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}