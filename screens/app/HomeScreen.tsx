// screens/app/HomeScreen.tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useAuth } from '../../context/AuthContext'

export default function HomeScreen() {
  const { session, signOut } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    setLoading(true)
    await signOut()
    setLoading(false)
    // Again — no navigation needed, RootNavigator handles it
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello 👋</Text>
      <Text style={styles.email}>{session?.user?.email}</Text>
      <Text style={styles.uid}>ID: {session?.user?.id}</Text>

      <TouchableOpacity style={styles.button} onPress={handleSignOut} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing out...' : 'Sign out'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  greeting: { fontSize: 32, fontWeight: '700', marginBottom: 12 },
  email: { fontSize: 16, color: '#555', marginBottom: 6 },
  uid: { fontSize: 11, color: '#aaa', marginBottom: 48 },
  button: { backgroundColor: '#000', borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
})