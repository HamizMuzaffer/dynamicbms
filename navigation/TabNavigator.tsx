import { Alert, View, StyleSheet } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import HomeScreen from '../screens/app/HomeScreen'
import SettingsScreen from '../screens/app/SettingsScreem'
import { useAuth } from '../context/AuthContext'

const Tab = createBottomTabNavigator()

function LogoutScreen() {
  return <View />
}

export default function TabNavigator() {
  const { signOut } = useAuth()
  const insets = useSafeAreaInsets()

  // insets.bottom is 34 on iPhone with home indicator
  // insets.bottom is the gesture nav bar height on Android with edgeToEdgeEnabled
  // On devices with physical buttons it is 0
  const bottomInset = insets.bottom

  const handleLogout = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => await signOut(),
        },
      ]
    )
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#050505',
          borderTopWidth: 1,
          borderTopColor: '#1a1a1a',
          // Total height = icon+label area + safe bottom inset
          height: 56 + bottomInset,
          // Push icons/labels up above the system gesture bar
          paddingBottom: bottomInset + 6,
          paddingTop: 8,
          // Prevent the tab bar from being pushed up by the keyboard
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Home') {
            return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          }
          if (route.name === 'Settings') {
            return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          }
          if (route.name === 'Logout') {
            return <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          }
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
      <Tab.Screen
        name="Logout"
        component={LogoutScreen}
        options={{
          tabBarLabel: 'Sign out',
          tabBarLabelStyle: { ...styles.label, color: '#ef4444' },
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault()
            handleLogout()
          },
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  item: {
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
})