import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LIGHT_THEME = {
  PRIMARY: '#1a73e8',
  SECONDARY: '#34a853',
  BACKGROUND_START: '#ffffff',
  BACKGROUND_END: '#f0f8ff',
  TEXT: '#1a1a1a',
  TEXT_SECONDARY: '#666666',
  CARD_BACKGROUND: '#ffffff',
  BORDER: '#e0e0e0',
  SHADOW: '#000000',
  SUCCESS: '#4CAF50',
  ERROR: '#f44336',
  WARNING: '#ff9800',
};

export const DARK_THEME = {
  PRIMARY: '#4285f4',
  SECONDARY: '#34a853',
  BACKGROUND_START: '#1a1a1a',
  BACKGROUND_END: '#2d2d2d',
  TEXT: '#ffffff',
  TEXT_SECONDARY: '#cccccc',
  CARD_BACKGROUND: '#2d2d2d',
  BORDER: '#404040',
  SHADOW: '#000000',
  SUCCESS: '#81c784',
  ERROR: '#e57373',
  WARNING: '#ffb74d',
};

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: typeof LIGHT_THEME;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  theme: LIGHT_THEME,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Load saved theme preference
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('isDarkMode');
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newThemeValue = !isDarkMode;
      setIsDarkMode(newThemeValue);
      await AsyncStorage.setItem('isDarkMode', JSON.stringify(newThemeValue));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = isDarkMode ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 