// screens/HomeScreen.tsx
import { useState, useCallback, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  StatusBar,
  TextInput,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../context/ThemeContext'
import { useMQTT } from '../../context/MQTTContext'
import { Theme } from '../../theme'
import { BMSPoint } from '../../context/MQTTContext'
 
// ── Role pill ─────────────────────────────────────────────────────────────────
function RolePill({ role, t }: { role: string; t: Theme }) {
  if (role === 'unknown') return null
  const isHeat = role === 'heat'
  return (
    <View style={{
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
      backgroundColor: isHeat ? t.heatBg   : t.coolBg,
      borderWidth: 1,
      borderColor:     isHeat ? t.heatBorder : t.coolBorder,
      marginTop: 3, alignSelf: 'flex-start',
    }}>
      <Text style={{
        fontSize: 9, fontWeight: '700', letterSpacing: 0.6,
        color: isHeat ? t.heat : t.cool,
        textTransform: 'uppercase',
      }}>
        {isHeat ? '🔥 Heat' : '❄️ Cool'}
      </Text>
    </View>
  )
}

// ── Connection banner shown when not live ─────────────────────────────────────
function StatusBanner({ status, message, onRetry, t }: any) {
  const isError = status === 'error'
  const isReconnecting = status === 'reconnecting' || status === 'connecting'

  const bg     = isError ? t.heatBg   : t.coolBg
  const border = isError ? t.heatBorder : t.coolBorder
  const color  = isError ? t.heat : t.cool

  return (
    <View style={[banner.wrap, { backgroundColor: bg, borderColor: border }]}>
      {isReconnecting
        ? <ActivityIndicator size="small" color={color} style={{ marginRight: 8 }} />
        : <Ionicons name={isError ? 'warning-outline' : 'wifi-outline'} size={15} color={color} />
      }
      <Text style={[banner.text, { color }]}>
        {status === 'connecting'    && 'Connecting to broker...'}
        {status === 'reconnecting'  && 'Reconnecting...'}
        {status === 'disconnected'  && 'Disconnected from broker'}
        {status === 'error'         && (message || 'Connection error')}
      </Text>
      {(isError || status === 'disconnected') && (
        <TouchableOpacity onPress={onRetry} style={[banner.btn, { borderColor: color }]}>
          <Text style={[banner.btnText, { color }]}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Individual point row ──────────────────────────────────────────────────────
function PointRow({ point, onToggle, onNumericSubmit, t }: {
  point: BMSPoint
  onToggle: (id: number, val: boolean) => void
  onNumericSubmit: (id: number, val: string) => void
  t: Theme
}) {
  const [localVal, setLocalVal] = useState(point.numValue)
  const isStale = point.lastSeen === null

  // Keep local input in sync with MQTT updates (when not focused)
  const [focused, setFocused] = useState(false)
  if (!focused && localVal !== point.numValue && point.numValue !== '') {
    setLocalVal(point.numValue)
  }

  const dotColor = point.type === 'toggle'
    ? (point.boolValue ? t.on : t.off)
    : (point.role === 'heat' ? t.heat : t.cool)

  return (
    <View style={[styles.row, { borderBottomColor: t.border }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.pointBar, { backgroundColor: isStale ? t.textMuted : dotColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.pointId, { color: t.textLabel }]}>Point {point.id}</Text>
          <Text style={[styles.pointName, { color: isStale ? t.textMuted : t.textPrimary }]}>
            {point.name}
          </Text>
          <RolePill role={point.role} t={t} />
        </View>
      </View>

      <View style={styles.rowRight}>
        {/* Not yet received any data */}
        {point.type === 'unknown' && (
          <View style={[styles.waitingBadge, { borderColor: t.border }]}>
            <ActivityIndicator size="small" color={t.textMuted} style={{ transform: [{ scale: 0.6 }] }} />
            <Text style={[styles.waitingText, { color: t.textMuted }]}>waiting</Text>
          </View>
        )}

        {/* Toggle */}
        {point.type === 'toggle' && (
          <View style={styles.toggleWrapper}>
            <Text style={[styles.toggleLabel, { color: point.boolValue ? t.on : t.off }]}>
              {point.boolValue ? 'ON' : 'OFF'}
            </Text>
            <Switch
              value={point.boolValue}
              onValueChange={(val) => onToggle(point.id, val)}
              trackColor={{ false: t.switchTrackOff, true: t.switchTrackOn }}
              thumbColor={point.boolValue ? t.on : '#6b7280'}
              ios_backgroundColor={t.switchTrackOff}
            />
          </View>
        )}

        {/* Numeric */}
        {point.type === 'numeric' && (
          <View style={[
            styles.numericWrapper,
            {
              backgroundColor: point.role === 'heat' ? t.heatBg   : t.coolBg,
              borderColor:     point.role === 'heat' ? t.heatBorder : t.coolBorder,
            }
          ]}>
            <TextInput
              style={[
                styles.numericInput,
                { color: point.role === 'heat' ? t.heat : t.cool }
              ]}
              value={localVal}
              onChangeText={setLocalVal}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false)
                if (localVal !== point.numValue && localVal.trim() !== '') {
                  onNumericSubmit(point.id, localVal)
                }
              }}
              onSubmitEditing={() => {
                if (localVal.trim() !== '') onNumericSubmit(point.id, localVal)
              }}
              keyboardType="numeric"
              returnKeyType="done"
              selectTextOnFocus
              placeholderTextColor={t.textMuted}
            />
            <Text style={[styles.numericUnit, { color: t.textMuted }]}>°C</Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatLastSync(ts: number | null): string {
  if (!ts) return 'No data yet'
  const secs = Math.floor((Date.now() - ts) / 1000)
  if (secs < 5)  return 'Just now'
  if (secs < 60) return `${secs}s ago`
  return `${Math.floor(secs / 60)}m ago`
}

function statusLabel(s: string): string {
  if (s === 'connected')   return 'Live'
  if (s === 'connecting')  return 'Connecting'
  if (s === 'reconnecting') return 'Reconnecting'
  return 'Offline'
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { theme: t, toggleTheme } = useTheme()
  const {
    status, statusMessage, config, isConnected,
    points, lastSync, sendToggle, sendNumeric, reconnect,
  } = useMQTT()

  const insets = useSafeAreaInsets()
  const [refreshing, setRefreshing] = useState(false)

  const topPadding = insets.top > 0
    ? insets.top
    : (Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await reconnect()
    setTimeout(() => setRefreshing(false), 1500)
  }, [reconnect])

  const heatPoints = points.filter(p => p.role === 'heat' || (p.role === 'unknown' && p.id <= 5))
  const coolPoints = points.filter(p => p.role === 'cool' || (p.role === 'unknown' && p.id > 5))

  const running  = points.filter(p => p.type === 'toggle'  && p.boolValue).length
  const stopped  = points.filter(p => p.type === 'toggle'  && !p.boolValue).length
  const heating  = points.filter(p => p.role === 'heat').length
  const cooling  = points.filter(p => p.role === 'cool').length

  const showBanner = status !== 'connected'

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.statusBar as any} backgroundColor={t.statusBg} translucent />

      {/* ── Header ── */}
      <View style={[styles.header, {
        paddingTop: topPadding + 12,
        borderBottomColor: t.border,
        backgroundColor: t.bg,
      }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerSite, { color: t.textPrimary }]} numberOfLines={1}>
            {config.namespace}
          </Text>
          <Text style={[styles.headerSub, { color: t.textMuted }]}>
            {config.brokerUrl}:{config.port}
          </Text>
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

          <View style={[
            styles.statusBadge,
            {
              backgroundColor: isConnected ? t.onBg    : t.heatBg,
              borderColor:     isConnected ? t.onBorder : t.heatBorder,
            }
          ]}>
            {(status === 'connecting' || status === 'reconnecting')
              ? <ActivityIndicator size="small" color={isConnected ? t.on : t.heat} style={{ width: 7, height: 7 }} />
              : <View style={[styles.statusDot, { backgroundColor: isConnected ? t.on : t.off }]} />
            }
            <Text style={[styles.statusText, { color: isConnected ? t.on : t.off }]}>
              {statusLabel(status)}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Connection banner ── */}
      {showBanner && (
        <StatusBanner
          status={status}
          message={statusMessage}
          onRetry={reconnect}
          t={t}
        />
      )}

      {/* ── Summary bar ── */}
      <View style={[styles.summaryBar, { backgroundColor: t.bgSummary, borderBottomColor: t.border }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: t.on }]}>{running}</Text>
          <Text style={[styles.summaryLabel, { color: t.textLabel }]}>Running</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: t.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: t.off }]}>{stopped}</Text>
          <Text style={[styles.summaryLabel, { color: t.textLabel }]}>Stopped</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: t.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: t.heat }]}>{heating}</Text>
          <Text style={[styles.summaryLabel, { color: t.textLabel }]}>Heating</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: t.border }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: t.cool }]}>{cooling}</Text>
          <Text style={[styles.summaryLabel, { color: t.textLabel }]}>Cooling</Text>
        </View>
      </View>

      {/* ── Points list ── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.cool}
            colors={[t.heat, t.cool]}
          />
        }
      >
        {/* Heating section */}
        <View style={[styles.sectionChip, { backgroundColor: t.heatBg, borderColor: t.heatBorder }]}>
          <View style={[styles.chipDot, { backgroundColor: t.heat }]} />
          <Text style={[styles.chipText, { color: t.heat }]}>Heating Points</Text>
        </View>
        {heatPoints.map(p => (
          <PointRow
            key={p.id} point={p} t={t}
            onToggle={sendToggle}
            onNumericSubmit={sendNumeric}
          />
        ))}

        {/* Cooling section */}
        <View style={[styles.sectionChip, { backgroundColor: t.coolBg, borderColor: t.coolBorder, marginTop: 20 }]}>
          <View style={[styles.chipDot, { backgroundColor: t.cool }]} />
          <Text style={[styles.chipText, { color: t.cool }]}>Cooling Points</Text>
        </View>
        {coolPoints.map(p => (
          <PointRow
            key={p.id} point={p} t={t}
            onToggle={sendToggle}
            onNumericSubmit={sendNumeric}
          />
        ))}

        {/* Footer with MQTT topic info and last sync */}
        <View style={[styles.footer, { borderTopColor: t.border }]}>
          <Text style={[styles.footerText, { color: t.textMuted }]}>
            Sub: {config.namespace}/status/point[1-10]/value
          </Text>
          <Text style={[styles.footerText, { color: t.textMuted }]}>
            Last sync: {formatLastSync(lastSync)}
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

// ── Banner styles ─────────────────────────────────────────────────────────────
const banner = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  text: { flex: 1, fontSize: 12, fontWeight: '500' },
  btn: {
    borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  btnText: { fontSize: 12, fontWeight: '600' },
})

// ── Main styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerSite: { fontSize: 20, fontWeight: '700', letterSpacing: 0.3 },
  headerSub:  { fontSize: 11, marginTop: 2, fontFamily: 'monospace' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, gap: 6,
  },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },

  summaryBar:     { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1 },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryValue:   { fontSize: 22, fontWeight: '700' },
  summaryLabel:   { fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryDivider: { width: 1, marginVertical: 4 },

  listContent: { paddingHorizontal: 20, paddingBottom: 30 },

  sectionChip: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1,
    marginTop: 20, marginBottom: 4, gap: 6,
  },
  chipDot:  { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13, borderBottomWidth: 1, minHeight: 68,
  },
  rowLeft: {
    flexDirection: 'row', alignItems: 'center',
    flex: 1, marginRight: 12, gap: 12,
  },
  pointBar:  { width: 3, height: 44, borderRadius: 2 },
  pointId:   { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  pointName: { fontSize: 15, fontWeight: '500', marginTop: 1 },
  rowRight:  { alignItems: 'flex-end' },

  waitingBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, gap: 4,
  },
  waitingText: { fontSize: 11 },

  toggleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel:   { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, minWidth: 28, textAlign: 'right' },

  numericWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, gap: 4,
  },
  numericInput: { fontSize: 18, fontWeight: '600', minWidth: 36, textAlign: 'center', padding: 0 },
  numericUnit:  { fontSize: 13, fontWeight: '500' },

  footer: { marginTop: 28, paddingTop: 16, borderTopWidth: 1, gap: 4 },
  footerText: { fontSize: 11, fontFamily: 'monospace' },
})