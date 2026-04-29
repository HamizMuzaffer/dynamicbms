// lib/mqttConfig.ts
// Handles encrypted storage and retrieval of MQTT connection settings
// Uses expo-secure-store which wraps iOS Keychain and Android Keystore

import * as SecureStore from 'expo-secure-store'

export interface MQTTConfig {
  brokerUrl:     string
  port:          string        // '1883' or '8883'
  username:      string
  password:      string
  namespace:     string        // Site name e.g. 'ButlinsMinehead'
  commandPrefix: string        // Niagara command prefix e.g. 'ButlineMinehead' (legacy typo retained by server)
  autoReconnect: boolean
}

export const DEFAULT_CONFIG: MQTTConfig = {
  brokerUrl:     'tridium.maxking.uk',
  port:          '8883',
  username:      'pmk',
  password:      'Maxking6262',
  namespace:     'ButlinsMinehead',
  commandPrefix: 'ButlineMinehead',
  autoReconnect: true,
}

const STORAGE_KEY = 'bms_mqtt_config'

export async function saveMQTTConfig(config: MQTTConfig): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(config))
}

export async function loadMQTTConfig(): Promise<MQTTConfig> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY)
    if (!raw) return DEFAULT_CONFIG
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_CONFIG
  }
}