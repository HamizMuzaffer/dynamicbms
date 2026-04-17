import { Alert, View, StyleSheet } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import HomeScreen from '../screens/app/HomeScreen'
import SettingsScreen from '../screens/app/SettingsScreem'
import { useAuth } from '../context/AuthContext'

const Tab = createBottomTabNavigator()

// Placeholder — never actually rendered, logout fires on tab press
function LogoutScreen() {
  return <View />
}

export default function TabNavigator() {
  const { signOut } = useAuth()

  const handleLogout = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await signOut()
            // AuthContext updates session → RootNavigator redirects to Login
          },
        },
      ]
    )
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#444',
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Home') {
            return (
              <Ionicons
                name={focused ? 'grid' : 'grid-outline'}
                size={22}
                color={color}
              />
            )
          }
          if (route.name === 'Settings') {
            return (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={22}
                color={color}
              />
            )
          }
          if (route.name === 'Logout') {
            return (
              <Ionicons
                name="log-out-outline"
                size={22}
                color="#ef4444"
              />
            )
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
            e.preventDefault() // block navigation — just show the alert
            handleLogout()
          },
        }}
      />
    </Tab.Navigator>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#050505',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    height: 62,
    paddingBottom: 8,
    paddingTop: 6,
  },
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