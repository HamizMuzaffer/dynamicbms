import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  StatusBar,
  TextInput,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const MOCK_NAMESPACE = 'Active_Harrow'
const MOCK_POINTS = [
  { id: 1,  name: 'Main Boiler',        type: 'toggle',  value: true  },
  { id: 2,  name: 'Pool Pump',          type: 'toggle',  value: false },
  { id: 3,  name: 'Flow Temperature',   type: 'numeric', value: '72'  },
  { id: 4,  name: 'Return Temperature', type: 'numeric', value: '58'  },
  { id: 5,  name: 'DHW Cylinder',       type: 'toggle',  value: true  },
  { id: 6,  name: 'AHU Fan Speed',      type: 'numeric', value: '65'  },
  { id: 7,  name: 'Chiller Unit',       type: 'toggle',  value: false },
  { id: 8,  name: 'Pool Water Temp',    type: 'numeric', value: '28'  },
  { id: 9,  name: 'Fresh Air Damper',   type: 'toggle',  value: true  },
  { id: 10, name: 'Zone 1 Setpoint',    type: 'numeric', value: '21'  },
]

function PointRow({ point, onToggle, onValueChange }: any) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={[
          styles.pointDot,
          { backgroundColor: point.type === 'toggle'
              ? (point.value ? '#22c55e' : '#ef4444')
              : '#3b82f6' }
        ]} />
        <View>
          <Text style={styles.pointId}>Point {point.id}</Text>
          <Text style={styles.pointName}>{point.name}</Text>
        </View>
      </View>

      <View style={styles.rowRight}>
        {point.type === 'toggle' ? (
          <View style={styles.toggleWrapper}>
            <Text style={[
              styles.toggleLabel,
              { color: point.value ? '#22c55e' : '#ef4444' }
            ]}>
              {point.value ? 'ON' : 'OFF'}
            </Text>
            <Switch
              value={point.value}
              onValueChange={(val) => onToggle(point.id, val)}
              trackColor={{ false: '#2a2a2a', true: '#166534' }}
              thumbColor={point.value ? '#22c55e' : '#6b7280'}
              ios_backgroundColor="#2a2a2a"
            />
          </View>
        ) : (
          <View style={styles.numericWrapper}>
            <TextInput
              style={styles.numericInput}
              value={point.value}
              onChangeText={(val) => onValueChange(point.id, val)}
              keyboardType="numeric"
              placeholderTextColor="#555"
            />
            <Text style={styles.numericUnit}>°C</Text>
          </View>
        )}
      </View>
    </View>
  )
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const [points, setPoints] = useState(MOCK_POINTS)
  const [isConnected] = useState(true)

  const handleToggle = (id: number, val: boolean) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, value: val } : p))
    // TODO: publish to [Namespace]/control/point[id]/set
  }

  const handleValueChange = (id: number, val: string) => {
    setPoints(prev => prev.map(p => p.id === id ? { ...p, value: val } : p))
    // TODO: publish to [Namespace]/control/point[id]/set
  }

  const onlineCount  = points.filter(p => p.type === 'toggle' && p.value === true).length
  const offlineCount = points.filter(p => p.type === 'toggle' && p.value === false).length
  const numericCount = points.filter(p => p.type === 'numeric').length

  // On Android, StatusBar height is not handled by SafeAreaView reliably
  // We manually pad the top using insets.top which works on both platforms
  const topPadding = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      {/* ── Header — sits below status bar on both platforms ── */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={styles.headerSite}>{MOCK_NAMESPACE}</Text>
          <Text style={styles.headerSub}>10 points monitored</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={[
            styles.statusDot,
            { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }
          ]} />
          <Text style={[
            styles.statusText,
            { color: isConnected ? '#22c55e' : '#ef4444' }
          ]}>
            {isConnected ? 'Live' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* ── Summary bar ── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{onlineCount}</Text>
          <Text style={styles.summaryLabel}>Running</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{offlineCount}</Text>
          <Text style={styles.summaryLabel}>Stopped</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#3b82f6' }]}>{numericCount}</Text>
          <Text style={styles.summaryLabel}>Setpoints</Text>
        </View>
      </View>

      {/* ── Points list ── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>Equipment Points</Text>

        {points.map((point, index) => (
          <View key={point.id}>
            <PointRow
              point={point}
              onToggle={handleToggle}
              onValueChange={handleValueChange}
            />
            {index < points.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Subscribing to {MOCK_NAMESPACE}/status/point[1-10]/value
          </Text>
          <Text style={styles.footerText}>Last sync: just now</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerSite: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#1f1f1f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingVertical: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22c55e',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#555',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#1a1a1a',
    marginVertical: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 64,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  pointDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pointId: {
    fontSize: 10,
    color: '#444',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  pointName: {
    fontSize: 15,
    color: '#ddd',
    fontWeight: '500',
    marginTop: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  toggleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    minWidth: 28,
    textAlign: 'right',
  },
  numericWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f0f',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  numericInput: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    minWidth: 36,
    textAlign: 'center',
    padding: 0,
  },
  numericUnit: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#111',
  },
  footer: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#111',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#333',
    fontFamily: 'monospace',
  },
})