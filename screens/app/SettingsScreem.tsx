import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
} from 'react-native'

// Section header component
function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

// Input field component matching login screen style
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  hint,
}: any) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#444"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  )
}

// Port selector pill buttons
function PortSelector({ selected, onSelect }: { selected: string; onSelect: (p: string) => void }) {
  const ports = ['1883', '8883']
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>Port</Text>
      <View style={styles.portRow}>
        {ports.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.portPill, selected === p && styles.portPillActive]}
            onPress={() => onSelect(p)}
          >
            <Text style={[styles.portPillText, selected === p && styles.portPillTextActive]}>
              {p}
              {p === '8883' ? '  SSL' : '  Standard'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.fieldHint}>
        {selected === '8883'
          ? 'Secure TLS connection — recommended for production'
          : 'Unencrypted — for testing only'}
      </Text>
    </View>
  )
}

export default function SettingsScreen() {
  // Connection settings — will be loaded from encrypted storage later
  const [brokerUrl, setBrokerUrl]       = useState('tridium.maxking.uk')
  const [port, setPort]                 = useState('8883')
  const [username, setUsername]         = useState('pmk')
  const [password, setPassword]         = useState('')
  const [namespace, setNamespace]       = useState('Active_Harrow')
  const [autoReconnect, setAutoReconnect] = useState(true)
  const [testStatus, setTestStatus]     = useState<null | 'testing' | 'success' | 'failed'>(null)

  const handleTestConnection = () => {
    setTestStatus('testing')
    // TODO: attempt real MQTT connection here
    setTimeout(() => {
      setTestStatus('success') // mock result for now
    }, 2000)
  }

  const handleSave = () => {
    // TODO: encrypt and save to device storage
    Alert.alert('Settings saved', 'Your connection settings have been saved securely.')
  }

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'This will disconnect from the current site. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => {} },
      ]
    )
  }

  const getTestButtonLabel = () => {
    if (testStatus === 'testing') return 'Testing...'
    if (testStatus === 'success') return 'Connected!'
    if (testStatus === 'failed')  return 'Failed — retry'
    return 'Test Connection'
  }

  const getTestButtonColor = () => {
    if (testStatus === 'success') return '#166534'
    if (testStatus === 'failed')  return '#7f1d1d'
    return '#1a1a1a'
  }

  const getTestBorderColor = () => {
    if (testStatus === 'success') return '#22c55e'
    if (testStatus === 'failed')  return '#ef4444'
    return '#2a2a2a'
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>MQTT broker configuration</Text>
        </View>
        {/* Connection indicator */}
        <View style={styles.connectedBadge}>
          <View style={styles.connectedDot} />
          <Text style={styles.connectedText}>Active_Harrow</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Broker connection ── */}
        <SectionHeader title="Broker Connection" />

        <View style={styles.card}>
          <Field
            label="Broker URL"
            value={brokerUrl}
            onChangeText={setBrokerUrl}
            placeholder="e.g. tridium.maxking.uk"
            hint="The address of your MQTT broker server"
          />
          <View style={styles.cardDivider} />
          <PortSelector selected={port} onSelect={setPort} />
        </View>

        {/* ── Authentication ── */}
        <SectionHeader title="Authentication" />

        <View style={styles.card}>
          <Field
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="MQTT username"
          />
          <View style={styles.cardDivider} />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="MQTT password"
            secureTextEntry
            hint="Stored encrypted on this device"
          />
        </View>

        {/* ── Site / Namespace ── */}
        <SectionHeader title="Site Configuration" />

        <View style={styles.card}>
          <Field
            label="Namespace (Site Name)"
            value={namespace}
            onChangeText={setNamespace}
            placeholder="e.g. Active_Harrow"
            hint="Changing this switches the app to a different facility instantly"
          />
          <View style={styles.cardDivider} />

          {/* Topic preview */}
          <View style={styles.topicPreview}>
            <Text style={styles.topicPreviewLabel}>Topic preview</Text>
            <Text style={styles.topicLine}>{namespace || '[Namespace]'}/config/point[1-10]/name</Text>
            <Text style={styles.topicLine}>{namespace || '[Namespace]'}/status/point[1-10]/value</Text>
            <Text style={styles.topicLine}>{namespace || '[Namespace]'}/control/point[1-10]/set</Text>
          </View>
        </View>

        {/* ── Behaviour ── */}
        <SectionHeader title="Behaviour" />

        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleRowLeft}>
              <Text style={styles.toggleRowLabel}>Auto-reconnect</Text>
              <Text style={styles.toggleRowSub}>Reconnect automatically if connection drops</Text>
            </View>
            <Switch
              value={autoReconnect}
              onValueChange={setAutoReconnect}
              trackColor={{ false: '#2a2a2a', true: '#166534' }}
              thumbColor={autoReconnect ? '#22c55e' : '#6b7280'}
              ios_backgroundColor="#2a2a2a"
            />
          </View>
        </View>

        {/* ── Test connection ── */}
        <TouchableOpacity
          style={[
            styles.testButton,
            {
              backgroundColor: getTestButtonColor(),
              borderColor: getTestBorderColor(),
            },
          ]}
          onPress={handleTestConnection}
          disabled={testStatus === 'testing'}
        >
          {testStatus === 'testing' && (
            <View style={styles.testingDot} />
          )}
          <Text style={[
            styles.testButtonText,
            testStatus === 'success' && { color: '#22c55e' },
            testStatus === 'failed'  && { color: '#ef4444' },
          ]}>
            {getTestButtonLabel()}
          </Text>
        </TouchableOpacity>

        {/* ── Save ── */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>

        {/* ── Danger zone ── */}
        <SectionHeader title="Session" />
        <View style={styles.card}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleDisconnect}>
            <Text style={styles.dangerText}>Disconnect from current site</Text>
            <Text style={styles.dangerArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Build info */}
        <View style={styles.buildInfo}>
          <Text style={styles.buildInfoText}>Dynamic BMS  •  Alpha build  •  v0.1.0</Text>
          <Text style={styles.buildInfoText}>Connected to {brokerUrl}:{port}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a1a0a',
    borderWidth: 1,
    borderColor: '#14532d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 6,
  },
  connectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  connectedText: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
  },

  // Scroll
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Section header
  sectionHeader: {
    fontSize: 11,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 28,
    marginBottom: 10,
  },

  // Card
  card: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#111',
  },

  // Field
  fieldWrapper: {
    padding: 16,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#ddd',
    backgroundColor: '#050505',
  },
  fieldHint: {
    fontSize: 11,
    color: '#444',
    marginTop: 6,
    lineHeight: 16,
  },

  // Port selector
  portRow: {
    flexDirection: 'row',
    gap: 10,
  },
  portPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#050505',
  },
  portPillActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#0c1a2e',
  },
  portPillText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  portPillTextActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },

  // Topic preview
  topicPreview: {
    padding: 16,
    paddingTop: 0,
    gap: 4,
  },
  topicPreviewLabel: {
    fontSize: 11,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  topicLine: {
    fontSize: 12,
    color: '#3b82f6',
    fontFamily: 'monospace',
    lineHeight: 20,
  },

  // Toggle row inside card
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  toggleRowLeft: {
    flex: 1,
    marginRight: 16,
  },
  toggleRowLabel: {
    fontSize: 15,
    color: '#ddd',
    fontWeight: '500',
  },
  toggleRowSub: {
    fontSize: 12,
    color: '#555',
    marginTop: 3,
  },

  // Test button
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 24,
    gap: 8,
  },
  testingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ddd',
  },

  // Save button
  saveButton: {
    backgroundColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },

  // Danger row
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dangerText: {
    fontSize: 15,
    color: '#ef4444',
    fontWeight: '500',
  },
  dangerArrow: {
    fontSize: 20,
    color: '#ef4444',
  },

  // Build info
  buildInfo: {
    marginTop: 32,
    alignItems: 'center',
    gap: 4,
  },
  buildInfoText: {
    fontSize: 11,
    color: '#2a2a2a',
    fontFamily: 'monospace',
  },
})