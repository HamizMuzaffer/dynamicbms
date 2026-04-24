// App.tsx
// Provider order matters:
// SafeAreaProvider → ThemeProvider → AuthProvider → MQTTProvider → Navigator

import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ThemeProvider }  from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MQTTProvider }   from './context/MQTTContext'

import LoginScreen  from './screens/auth/LoginScreen'
import TabNavigator from './navigation/TabNavigator'

const Stack = createNativeStackNavigator()

// Inner navigator — reads auth state to decide which screen to show
function RootNavigator() {
  const { session, loading } = useAuth()
  if (loading) return null   // splash is already shown by LoginScreen loader

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {session
        ? <Stack.Screen name="Main" component={AppWithMQTT} />
        : <Stack.Screen name="Login" component={LoginScreen} />
      }
    </Stack.Navigator>
  )
}

// MQTT provider only wraps authenticated screens
// This prevents MQTT connecting before the user has logged in
function AppWithMQTT() {
  return (
    <MQTTProvider>
      <TabNavigator />
    </MQTTProvider>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}