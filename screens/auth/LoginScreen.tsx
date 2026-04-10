import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) Alert.alert('Login failed', error)
    // No navigation needed — AuthContext updates session → RootNavigator re-renders
  }

  return (
    <View style={styles.container}>
    <Text style={styles.main}>Dynamic BMS</Text>

      <TextInput style={styles.title}>Welcome back</TextInput>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 32 },
  main : { fontSize: 32, fontWeight: '800', marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#000', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  link: { textAlign: 'center', color: '#555', fontSize: 14 },
})