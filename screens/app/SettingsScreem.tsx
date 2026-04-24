// screens/SettingsScreen.tsx
import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, StatusBar, Alert, Switch, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../context/ThemeContext'
import { useMQTT } from '../../context/MQTTContext'
import { MQTTConfig } from '../../state/lib/mqttConfig'
import { Theme } from '../../theme'

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ title, t }: { title: string; t: Theme }) {
  return <Text style={[styles.sectionHeader, { color: t.textLabel }]}>{title}</Text>
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, hint, t }: any) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.fieldLabel, { color: t.textLabel }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: t.bgInput, borderColor: t.borderMid, color: t.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint ? <Text style={[styles.fieldHint, { color: t.textMuted }]}>{hint}</Text> : null}
    </View>
  )
}

function PortSelector({ selected, onSelect, t }: { selected: string; onSelect: (p: string) => void; t: Theme }) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.fieldLabel, { color: t.textLabel }]}>Port</Text>
      <View style={styles.portRow}>
        {['1883', '8883'].map(p => {
          const active   = selected === p
          const isSecure = p === '8883'
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.portPill,
                { backgroundColor: t.bgInput, borderColor: t.borderMid },
                active && { borderColor: isSecure ? t.cool : t.heat, backgroundColor: isSecure ? t.coolBg : t.heatBg },
              ]}
              onPress={() => onSelect(p)}
            >
              <Ionicons
                name={isSecure ? 'lock-closed-outline' : 'lock-open-outline'}
                size={13}
                color={active ? (isSecure ? t.cool : t.heat) : t.textMuted}
              />
              <Text style={[
                styles.portPillText, { color: t.textMuted },
                active && { color: isSecure ? t.cool : t.heat, fontWeight: '700' },
              ]}>
                {p}  {isSecure ? 'SSL' : 'Standard'}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <Text style={[styles.fieldHint, { color: t.textMuted }]}>
        {selected === '8883'
          ? 'Secure TLS — recommended. Requires WebSocket port 9883 on broker.'
          : 'Unencrypted — for local testing only. WebSocket port 9001.'}
      </Text>
    </View>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { theme: t, toggleTheme } = useTheme()
  const { config, status, isConnected, applyConfig, testConnection } = useMQTT()
  const insets = useSafeAreaInsets()

  // Local form state — mirrors saved config until Save is pressed
  const [brokerUrl,     setBrokerUrl]     = useState(config.brokerUrl)
  const [port,          setPort]          = useState(config.port)
  const [username,      setUsername]      = useState(config.username)
  const [password,      setPassword]      = useState(config.password)
  const [namespace,     setNamespace]     = useState(config.namespace)
  const [autoReconnect, setAutoReconnect] = useState(config.autoReconnect)
  const [testStatus,    setTestStatus]    = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testError,     setTestError]     = useState('')
  const [saving,        setSaving]        = useState(false)
  const [isDirty,       setIsDirty]       = useState(false)

  // Re-sync local state if context config changes (e.g. first load)
  useEffect(() => {
    setBrokerUrl(config.brokerUrl)
    setPort(config.port)
    setUsername(config.username)
    setPassword(config.password)
    setNamespace(config.namespace)
    setAutoReconnect(config.autoReconnect)
  }, [config.brokerUrl, config.port, config.username, config.namespace])

  const markDirty = (setter: (v: any) => void) => (v: any) => {
    setter(v)
    setIsDirty(true)
    setTestStatus('idle')
  }

  const topPadding = insets.top > 0
    ? insets.top
    : (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0)

  const builtConfig = (): MQTTConfig => ({
    brokerUrl, port, username, password, namespace, autoReconnect,
  })

  const handleTest = async () => {
    setTestStatus('testing')
    setTestError('')
    const result = await testConnection(builtConfig())
    setTestStatus(result.ok ? 'ok' : 'fail')
    setTestError(result.error ?? '')
  }

  const handleSave = async () => {
    if (!brokerUrl.trim() || !namespace.trim()) {
      Alert.alert('Validation', 'Broker URL and Namespace are required.')
      return
    }
    setSaving(true)
    await applyConfig(builtConfig())
    setSaving(false)
    setIsDirty(false)
    Alert.alert(
      'Settings saved',
      namespace !== config.namespace
        ? `Switched to site: ${namespace}`
        : 'Connection settings updated.'
    )
  }

  const handleDisconnect = () => {
    Alert.alert('Disconnect', 'Disconnect from current site?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect', style: 'destructive',
        onPress: () => applyConfig({ ...builtConfig(), autoReconnect: false }),
      },
    ])
  }

  // Test button appearance
  const testBg     = testStatus === 'ok'   ? t.onBg     : testStatus === 'fail' ? t.heatBg   : t.bgCard
  const testBorder = testStatus === 'ok'   ? t.onBorder : testStatus === 'fail' ? t.heatBorder : t.borderMid
  const testColor  = testStatus === 'ok'   ? t.on       : testStatus === 'fail' ? t.heat       : t.textSecondary
  const testLabel  = testStatus === 'testing' ? 'Testing...'
                   : testStatus === 'ok'      ? '✓ Connected!'
                   : testStatus === 'fail'    ? '✗ Failed — retry'
                   : 'Test Connection'

  // Connection status line
  const connStatusColor = isConnected ? t.on
    : status === 'connecting' || status === 'reconnecting' ? t.cool : t.heat

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar as any} backgroundColor={t.statusBg} translucent />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: t.border, backgroundColor: t.bg }]}>
        <View>
          <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Settings</Text>
          <Text style={[styles.headerSub,   { color: t.textMuted  }]}>MQTT broker configuration</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.iconBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
          >
            <Ionicons
              name={t.dark ? 'sunny-outline' : 'moon-outline'}
              size={16}
              color={t.dark ? '#f59e0b' : '#6366f1'}
            />
          </TouchableOpacity>
          <View style={[styles.connBadge, { backgroundColor: isConnected ? t.onBg : t.heatBg, borderColor: isConnected ? t.onBorder : t.heatBorder }]}>
            <View style={[styles.connDot, { backgroundColor: connStatusColor }]} />
            <Text style={[styles.connText, { color: connStatusColor }]}>
              {isConnected ? config.namespace : status}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Dirty warning */}
        {isDirty && (
          <View style={[styles.dirtyBanner, { backgroundColor: t.coolBg, borderColor: t.coolBorder }]}>
            <Ionicons name="information-circle-outline" size={15} color={t.cool} />
            <Text style={[styles.dirtyText, { color: t.cool }]}>
              Unsaved changes — tap Save to apply
            </Text>
          </View>
        )}

        {/* ── Broker ── */}
        <SectionHeader title="Broker Connection" t={t} />
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Field
            label="Broker URL / IP" value={brokerUrl}
            onChangeText={markDirty(setBrokerUrl)}
            placeholder="e.g. tridium.maxking.uk"
            hint="Hostname or IP address of your MQTT broker" t={t}
          />
          <View style={[styles.div, { backgroundColor: t.border }]} />
          <PortSelector selected={port} onSelect={markDirty(setPort)} t={t} />
        </View>

        {/* ── Auth ── */}
        <SectionHeader title="Authentication" t={t} />
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Field
            label="Username" value={username}
            onChangeText={markDirty(setUsername)}
            placeholder="MQTT username" t={t}
          />
          <View style={[styles.div, { backgroundColor: t.border }]} />
          <Field
            label="Password" value={password}
            onChangeText={markDirty(setPassword)}
            placeholder="MQTT password" secureTextEntry
            hint="Stored encrypted in device secure storage" t={t}
          />
        </View>

        {/* ── Site / Namespace ── */}
        <SectionHeader title="Site Configuration" t={t} />
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <Field
            label="Namespace (Site Name)" value={namespace}
            onChangeText={markDirty(setNamespace)}
            placeholder="e.g. Active_Harrow"
            hint="Changing this instantly switches the app to a different facility" t={t}
          />
          <View style={[styles.div, { backgroundColor: t.border }]} />

          {/* Topic preview — updates live as you type */}
          <View style={styles.fieldWrapper}>
            <Text style={[styles.fieldLabel, { color: t.textLabel }]}>Topic preview</Text>
            <View style={[styles.topicBox, { backgroundColor: t.bgInput, borderColor: t.borderMid }]}>
              <View style={styles.topicRow}>
                <View style={[styles.topicDot, { backgroundColor: t.textMuted }]} />
                <Text style={[styles.topicLine, { color: t.textMuted }]}>
                  {namespace || '[Namespace]'}/config/point[1-10]/name
                </Text>
              </View>
              <View style={styles.topicRow}>
                <View style={[styles.topicDot, { backgroundColor: t.cool }]} />
                <Text style={[styles.topicLine, { color: t.cool }]}>
                  {namespace || '[Namespace]'}/status/point[1-10]/value
                </Text>
              </View>
              <View style={styles.topicRow}>
                <View style={[styles.topicDot, { backgroundColor: t.heat }]} />
                <Text style={[styles.topicLine, { color: t.heat }]}>
                  {namespace || '[Namespace]'}/control/point[1-10]/set
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Behaviour ── */}
        <SectionHeader title="Behaviour" t={t} />
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <View style={styles.switchRow}>
            <View style={styles.switchRowLeft}>
              <Text style={[styles.switchLabel, { color: t.textPrimary }]}>Auto-reconnect</Text>
              <Text style={[styles.switchSub,   { color: t.textMuted   }]}>
                Reconnect automatically if connection drops
              </Text>
            </View>
            <Switch
              value={autoReconnect}
              onValueChange={markDirty(setAutoReconnect)}
              trackColor={{ false: t.switchTrackOff, true: t.switchTrackOn }}
              thumbColor={autoReconnect ? t.on : '#6b7280'}
              ios_backgroundColor={t.switchTrackOff}
            />
          </View>
          <View style={[styles.div, { backgroundColor: t.border }]} />
          <View style={styles.switchRow}>
            <View style={styles.switchRowLeft}>
              <Text style={[styles.switchLabel, { color: t.textPrimary }]}>
                {t.dark ? 'Dark mode' : 'Light mode'}
              </Text>
              <Text style={[styles.switchSub, { color: t.textMuted }]}>
                Switch app appearance
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.themeBtn, { backgroundColor: t.bgInput, borderColor: t.borderMid }]}
            >
              <Ionicons
                name={t.dark ? 'sunny-outline' : 'moon-outline'}
                size={18}
                color={t.dark ? '#f59e0b' : '#6366f1'}
              />
              <Text style={[styles.themeBtnText, { color: t.textSecondary }]}>
                {t.dark ? 'Light' : 'Dark'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test error detail */}
        {testStatus === 'fail' && testError !== '' && (
          <View style={[styles.errorBox, { backgroundColor: t.heatBg, borderColor: t.heatBorder }]}>
            <Text style={[styles.errorText, { color: t.heat }]}>{testError}</Text>
          </View>
        )}

        {/* ── Test button ── */}
        <TouchableOpacity
          style={[styles.testBtn, { backgroundColor: testBg, borderColor: testBorder }]}
          onPress={handleTest}
          disabled={testStatus === 'testing'}
        >
          {testStatus === 'testing'
            ? <Ionicons name="reload-outline" size={16} color={t.cool} />
            : testStatus === 'ok'
            ? <Ionicons name="checkmark-circle-outline" size={16} color={t.on} />
            : testStatus === 'fail'
            ? <Ionicons name="close-circle-outline" size={16} color={t.heat} />
            : <Ionicons name="wifi-outline" size={16} color={t.textSecondary} />
          }
          <Text style={[styles.testBtnText, { color: testColor }]}>{testLabel}</Text>
        </TouchableOpacity>

        {/* ── Save button ── */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: t.textPrimary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={[styles.saveBtnText, { color: t.bg }]}>
            {saving ? 'Saving...' : isDirty ? 'Save & Apply' : 'Save Settings'}
          </Text>
        </TouchableOpacity>

        {/* ── Session ── */}
        <SectionHeader title="Session" t={t} />
        <View style={[styles.card, { backgroundColor: t.bgCard, borderColor: t.border }]}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleDisconnect}>
            <View style={styles.dangerLeft}>
              <Ionicons name="power-outline" size={18} color={t.heat} />
              <Text style={[styles.dangerText, { color: t.heat }]}>Disconnect from current site</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={t.heat} />
          </TouchableOpacity>
        </View>

        {/* Build info */}
        <View style={styles.buildInfo}>
          <Text style={[styles.buildInfoText, { color: t.textMuted }]}>
            Dynamic BMS  •  Alpha  •  v0.1.0
          </Text>
          <Text style={[styles.buildInfoText, { color: t.textMuted }]}>
            {config.brokerUrl}:{config.port}  •  {status}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  headerTitle:  { fontSize: 22, fontWeight: '700' },
  headerSub:    { fontSize: 12, marginTop: 2 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  connBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1, gap: 6,
  },
  connDot:  { width: 6, height: 6, borderRadius: 3 },
  connText: { fontSize: 11, fontWeight: '600' },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  dirtyBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 16,
  },
  dirtyText: { fontSize: 12, fontWeight: '500', flex: 1 },

  sectionHeader: {
    fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 1.2, marginTop: 28, marginBottom: 10,
  },
  card: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  div:  { height: 1 },

  fieldWrapper: { padding: 16 },
  fieldLabel:   { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
  fieldHint:    { fontSize: 11, marginTop: 6, lineHeight: 16 },

  portRow:  { flexDirection: 'row', gap: 10 },
  portPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8, paddingVertical: 10,
  },
  portPillText: { fontSize: 13 },

  topicBox: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 6 },
  topicRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topicDot: { width: 5, height: 5, borderRadius: 3 },
  topicLine: { fontSize: 11, fontFamily: 'monospace', flex: 1 },

  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  switchRowLeft: { flex: 1, marginRight: 16 },
  switchLabel:   { fontSize: 15, fontWeight: '500' },
  switchSub:     { fontSize: 12, marginTop: 3 },
  themeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  themeBtnText: { fontSize: 13, fontWeight: '600' },

  errorBox:  { borderWidth: 1, borderRadius: 8, padding: 12, marginTop: 12 },
  errorText: { fontSize: 12, fontFamily: 'monospace' },

  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 24, gap: 8,
  },
  testBtnText: { fontSize: 15, fontWeight: '600' },

  saveBtn:     { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  saveBtnText: { fontSize: 15, fontWeight: '700' },

  dangerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16,
  },
  dangerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dangerText: { fontSize: 15, fontWeight: '500' },

  buildInfo:     { marginTop: 32, alignItems: 'center', gap: 4 },
  buildInfoText: { fontSize: 11, fontFamily: 'monospace' },
})