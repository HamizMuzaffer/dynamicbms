import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_300Light,
} from '@expo-google-fonts/poppins'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const { width, height } = Dimensions.get('window')

// ─── Screen Loader ───────────────────────────────────────────────────────────
function ScreenLoader() {
  const pulse  = useRef(new Animated.Value(0.6)).current
  const rotate = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse,  { toValue: 1,   duration: 800,  useNativeDriver: true }),
        Animated.timing(pulse,  { toValue: 0.6, duration: 800,  useNativeDriver: true }),
      ])
    ).start()
    Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 2400, useNativeDriver: true })
    ).start()
  }, [])

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <View style={loader.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <Animated.View style={[loader.ring, { transform: [{ rotate: spin }] }]}>
        <View style={loader.ringInner} />
      </Animated.View>
      <Image
        source={require('../../assets/logo.png')}
        style={loader.logo}
        resizeMode="contain"
      />
    </View>
  )
}

// ─── Animated Input ──────────────────────────────────────────────────────────
function AnimatedInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  accentColor,
  bgColor,
  textColor,
  mutedColor,
  borderBaseColor,
}: any) {
  const [focused, setFocused] = useState(false)
  const anim = useRef(new Animated.Value(0)).current

  const handleFocus = () => {
    setFocused(true)
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start()
  }
  const handleBlur = () => {
    setFocused(false)
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start()
  }

  const borderColor = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [borderBaseColor, accentColor],
  })

  return (
    <Animated.View style={[styles.inputWrapper, { borderColor, backgroundColor: bgColor }]}>
      <TextInput
        style={[styles.input, { color: textColor }]}
        placeholder={placeholder}
        placeholderTextColor={mutedColor}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        selectionColor={accentColor}
      />
      {focused && (
        <View style={[styles.inputGlow, { backgroundColor: accentColor }]} />
      )}
    </Animated.View>
  )
}

// ─── Main Login Screen ───────────────────────────────────────────────────────
export default function LoginScreen({ navigation }: any) {
  const { signIn }           = useAuth()
  const { theme: t, toggleTheme } = useTheme()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [appReady, setAppReady] = useState(false)

  // Entry animations
  const fadeAnim   = useRef(new Animated.Value(0)).current
  const slideAnim  = useRef(new Animated.Value(40)).current
  const logoScale  = useRef(new Animated.Value(0.7)).current
  const logoOpacity = useRef(new Animated.Value(0)).current

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_300Light,
  })

  useEffect(() => {
    if (fontsLoaded) {
      setTimeout(() => {
        setAppReady(true)
        Animated.parallel([
          Animated.spring(logoScale,   { toValue: 1, friction: 5,    useNativeDriver: true }),
          Animated.timing(logoOpacity, { toValue: 1, duration: 600,  useNativeDriver: true }),
          Animated.timing(fadeAnim,    { toValue: 1, duration: 700,  delay: 200, useNativeDriver: true }),
          Animated.timing(slideAnim,   { toValue: 0, duration: 600,  delay: 200, useNativeDriver: true }),
        ]).start()
      }, 1800)
    }
  }, [fontsLoaded])

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) Alert.alert('Login failed', error)
  }

  if (!fontsLoaded || !appReady) return <ScreenLoader />

  // ── Dynamic colours from theme ─────────────────────────────────────────────
  // The login screen keeps the same strong dark card in both modes
  // but adapts the outer background and text for light mode
  const outerBg   = t.dark ? '#0D0D0D' : '#E8EBF0'
  const cardBg    = t.dark ? '#1A1A1A' : '#FFFFFF'
  const cardBorder = t.dark ? '#2A2A2A' : '#E2E5EA'
  const inputBg   = t.dark ? '#111111' : '#F5F7FA'
  const inputBorder = t.dark ? '#2A2A2A' : '#D0D4DB'
  const textPrimary  = t.dark ? '#F0F0F0' : '#0F1117'
  const textSecondary = t.dark ? '#888888' : '#4A5568'
  const textMuted    = t.dark ? '#6B6B6B' : '#9AA0AD'

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: outerBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar
        barStyle={t.dark ? 'light-content' : 'dark-content'}
        backgroundColor={outerBg}
      />

      {/* ── Background blobs — red top-left, blue bottom-right ── */}
      <View style={[styles.blobRed,   { backgroundColor: t.heat }]} />
      <View style={[styles.blobBlue,  { backgroundColor: t.cool }]} />

      {/* ── Theme toggle — top right corner ── */}
      <TouchableOpacity
        style={[styles.themeToggle, { backgroundColor: cardBg, borderColor: cardBorder }]}
        onPress={toggleTheme}
      >
        <Ionicons
          name={t.dark ? 'sunny-outline' : 'moon-outline'}
          size={18}
          color={t.dark ? '#f59e0b' : '#6366f1'}
        />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* ── Logo ── */}
        <Animated.View
          style={[
            styles.logoWrapper,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <View style={[styles.logoGlow, { backgroundColor: t.heat }]} />
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* ── Title ── */}
        <Text style={[styles.appName, { color: textPrimary }]}>Dynamic BMS</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>Sign in to your account</Text>

        {/* ── Red | dot | Blue divider (matching logo colours) ── */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: t.heat }]} />
          <View style={[styles.dividerDot,  { backgroundColor: textPrimary }]} />
          <View style={[styles.dividerLine, { backgroundColor: t.cool }]} />
        </View>

        {/* ── Card ── */}
        <View style={[
          styles.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            shadowColor: t.dark ? '#000' : '#b0b8c8',
          }
        ]}>

          {/* Email */}
          <Text style={[styles.label, { color: textSecondary }]}>Email Address</Text>
          <AnimatedInput
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            accentColor={t.heat}
            bgColor={inputBg}
            textColor={textPrimary}
            mutedColor={textMuted}
            borderBaseColor={inputBorder}
          />

          {/* Password */}
          <Text style={[styles.label, { marginTop: 16, color: textSecondary }]}>Password</Text>
          <AnimatedInput
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accentColor={t.cool}
            bgColor={inputBg}
            textColor={textPrimary}
            mutedColor={textMuted}
            borderBaseColor={inputBorder}
          />

          {/* ── Sign In button ── */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: t.dark ? '#161616' : '#0F1117',
                borderColor: t.heat,
                shadowColor: t.heat,
              }
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <View style={styles.buttonInner}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  {/* Left red accent */}
                  <View style={[styles.buttonAccentLeft,  { backgroundColor: t.heat }]} />
                  <Text style={styles.buttonText}>Sign In</Text>
                  {/* Right blue accent */}
                  <View style={[styles.buttonAccentRight, { backgroundColor: t.cool }]} />
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Forgot password */}
          <TouchableOpacity style={styles.forgotWrapper}>
            <Text style={[styles.forgotText, { color: textMuted }]}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        {/* ── Status row — shows connection colour coding explanation ── */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: t.heat }]} />
            <Text style={[styles.legendText, { color: textMuted }]}>Heating</Text>
          </View>
          <View style={[styles.legendSep, { backgroundColor: textMuted }]} />
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: t.cool }]} />
            <Text style={[styles.legendText, { color: textMuted }]}>Cooling</Text>
          </View>
          <View style={[styles.legendSep, { backgroundColor: textMuted }]} />
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: t.on }]} />
            <Text style={[styles.legendText, { color: textMuted }]}>Running</Text>
          </View>
        </View>

        <Text style={[styles.footer, { color: textMuted }]}>
          © Dynamic BMS · All rights reserved
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Background blobs
  blobRed: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.08,
  },
  blobBlue: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.08,
  },

  // Theme toggle button — top right
  themeToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    right: 24,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Logo
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.12,
  },
  logo: {
    width: 100,
    height: 100,
  },

  // Title
  appName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Poppins_300Light',
    fontSize: 13,
    letterSpacing: 0.5,
    marginBottom: 20,
  },

  // Red | dot | Blue divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '70%',
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    opacity: 0.7,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 8,
    opacity: 0.5,
  },

  // Card
  card: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },

  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Input
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.8,
  },

  // Button
  button: {
    marginTop: 28,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    position: 'relative',
  },
  buttonAccentLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  buttonAccentRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  buttonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  forgotWrapper: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
  },

  // Colour legend row below card
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Poppins_300Light',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  legendSep: {
    width: 1,
    height: 10,
    opacity: 0.3,
  },

  footer: {
    fontFamily: 'Poppins_300Light',
    fontSize: 11,
    marginTop: 16,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
})

// ─── Loader styles ────────────────────────────────────────────────────────────
const loader = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#ef4444',
    borderRightColor: '#3b82f6',
  },
  ringInner: {
    position: 'absolute',
    width: 120,
    height: 120,
    top: 8,
    left: 8,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  logo: {
    width: 80,
    height: 80,
  },
})