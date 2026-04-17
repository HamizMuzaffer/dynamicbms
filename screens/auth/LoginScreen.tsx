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
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold, Poppins_300Light } from '@expo-google-fonts/poppins'
import { useAuth } from '../../context/AuthContext'

const { width, height } = Dimensions.get('window')

// ─── Palette extracted from logo ────────────────────────────────────────────
const COLORS = {
  bg: '#0D0D0D',
  surface: '#161616',
  card: '#1A1A1A',
  red: '#C0392B',
  redGlow: '#E74C3C',
  green: '#1E8449',
  greenGlow: '#27AE60',
  white: '#FFFFFF',
  muted: '#6B6B6B',
  border: '#2A2A2A',
  inputBg: '#111111',
  textPrimary: '#F0F0F0',
  textSecondary: '#888888',
}

// ─── Screen Loader ───────────────────────────────────────────────────────────
function ScreenLoader() {
  const pulse = useRef(new Animated.Value(0.6)).current
  const rotate = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ])
    ).start()

    Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 2400, useNativeDriver: true })
    ).start()
  }, [])

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  return (
    <View style={loader.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <Animated.View style={[loader.ring, { transform: [{ rotate: spin }] }]}>
        <View style={loader.ringInner} />
      </Animated.View>
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
    inputRange: [0, 1],
    outputRange: [COLORS.border, accentColor],
  })

  return (
    <Animated.View style={[styles.inputWrapper, { borderColor }]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        selectionColor={accentColor}
      />
      {focused && <View style={[styles.inputGlow, { backgroundColor: accentColor }]} />}
    </Animated.View>
  )
}

// ─── Main Login Screen ───────────────────────────────────────────────────────
export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [appReady, setAppReady] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(40)).current
  const logoScale = useRef(new Animated.Value(0.7)).current
  const logoOpacity = useRef(new Animated.Value(0)).current

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_300Light,
  })

  useEffect(() => {
    if (fontsLoaded) {
      // Simulate splash → login transition
      setTimeout(() => {
        setAppReady(true)
        Animated.parallel([
          Animated.spring(logoScale, { toValue: 1, friction: 5, useNativeDriver: true }),
          Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 200, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 600, delay: 200, useNativeDriver: true }),
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

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Background gradient blobs */}
      <View style={styles.blobRed} />
      <View style={styles.blobGreen} />

      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrapper,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <View style={styles.logoGlow} />
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Title */}
        <Text style={styles.appName}>Dynamic BMS</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: COLORS.red }]} />
          <View style={[styles.dividerDot]} />
          <View style={[styles.dividerLine, { backgroundColor: COLORS.green }]} />
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Email Address</Text>
          <AnimatedInput
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            accentColor={COLORS.redGlow}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <AnimatedInput
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            accentColor={COLORS.greenGlow}
          />

          {/* Sign In Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <View style={styles.buttonInner}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <View style={styles.buttonAccentLeft} />
                  <Text style={styles.buttonText}>Sign In</Text>
                  <View style={styles.buttonAccentRight} />
                </>
              )}
            </View>
          </TouchableOpacity>

          {/* Footer link */}
          <TouchableOpacity style={styles.forgotWrapper}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© Dynamic BMS · All rights reserved</Text>
      </Animated.View>
    </KeyboardAvoidingView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  blobRed: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.red,
    opacity: 0.08,
  },
  blobGreen: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.green,
    opacity: 0.07,
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
    backgroundColor: COLORS.red,
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
    color: COLORS.textPrimary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Poppins_300Light',
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 20,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '70%',
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    opacity: 0.6,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
    marginHorizontal: 8,
    opacity: 0.4,
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },

  label: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Input
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: COLORS.inputBg,
    overflow: 'hidden',
    position: 'relative',
  },
  input: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.red,
    shadowColor: COLORS.red,
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
    backgroundColor: COLORS.red,
  },
  buttonAccentRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.green,
  },
  buttonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: COLORS.white,
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
    color: COLORS.muted,
  },

  footer: {
    fontFamily: 'Poppins_300Light',
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 28,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
})

// ─── Loader Styles ───────────────────────────────────────────────────────────
const loader = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
    borderTopColor: COLORS.red,
    borderRightColor: COLORS.green,
  },
  ringInner: {
    position: 'absolute',
    width: 120,
    height: 120,
    top: 8,
    left: 8,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logo: {
    width: 90,
    height: 90,
  },
  text: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: COLORS.textPrimary,
    marginTop: 56,
    letterSpacing: 2,
  },
})