// navigation/TabNavigator.tsx
import { Alert, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import HomeScreen from '../screens/app/HomeScreen'
import SettingsScreen from '../screens/app/SettingsScreem'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const Tab = createBottomTabNavigator()
function LogoutScreen() { return <View /> }

export default function TabNavigator() {
  const { signOut }  = useAuth()
  const { theme: t } = useTheme()
  const insets       = useSafeAreaInsets()
  const bottomInset  = insets.bottom

  const handleLogout = () =>
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => await signOut() },
    ])

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: t.tabBg,
          borderTopWidth: 1,
          borderTopColor: t.tabBorder,
          height: 56 + bottomInset,
          paddingBottom: bottomInset + 6,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          elevation: 0,
        },
        tabBarActiveTintColor:   t.tabActive,
        tabBarInactiveTintColor: t.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginTop: 2 },
        tabBarItemStyle:  { paddingVertical: 2 },
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Home')
            return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={22} color={color} />
          if (route.name === 'Settings')
            return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={color} />
          if (route.name === 'Logout')
            return <Ionicons name="log-out-outline" size={22} color={t.heat} />
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
      <Tab.Screen
        name="Logout"
        component={LogoutScreen}
        options={{
          tabBarLabel: 'Sign out',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginTop: 2, color: t.heat },
        }}
        listeners={{ tabPress: e => { e.preventDefault(); handleLogout() } }}
      />
    </Tab.Navigator>
  )
}