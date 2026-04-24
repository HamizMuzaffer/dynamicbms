// context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'
import { getTheme, Theme, ThemeMode } from '../theme'

interface ThemeContextType {
  theme: Theme
  mode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType)

const STORAGE_KEY = '@bms_theme_mode'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to the device's system preference
  const systemScheme = useColorScheme()
  const [mode, setMode] = useState<ThemeMode>(systemScheme === 'light' ? 'light' : 'dark')

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setMode(saved)
    })
  }, [])

  const toggleTheme = async () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    await AsyncStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <ThemeContext.Provider value={{ theme: getTheme(mode), mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)