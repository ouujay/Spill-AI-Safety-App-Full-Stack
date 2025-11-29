// theme/ThemeProvider.js - FIXED VERSION with dark mode default
import React, { createContext, useContext, useState, useEffect } from "react";
import { Appearance, StatusBar } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes } from "./theme";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // DEFAULT TO DARK MODE - Changed from light to dark
  const [theme, setTheme] = useState(themes.dark);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      // Check if user has a saved theme preference
      const savedTheme = await AsyncStorage.getItem("themePreference");
      
      if (savedTheme) {
        // Use saved preference
        setTheme(savedTheme === "dark" ? themes.dark : themes.light);
      } else {
        // CHANGED: Default to dark mode instead of system preference
        setTheme(themes.dark);
        // Save dark as the default preference
        await AsyncStorage.setItem("themePreference", "dark");
      }
    } catch (error) {
      console.error("Error loading theme preference:", error);
      // Fallback to dark mode
      setTheme(themes.dark);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme.mode === "dark" ? themes.light : themes.dark;
    setTheme(newTheme);
    
    try {
      // Save theme preference
      await AsyncStorage.setItem("themePreference", newTheme.mode);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const setSpecificTheme = async (themeMode) => {
    const newTheme = themeMode === "dark" ? themes.dark : themes.light;
    setTheme(newTheme);
    
    try {
      await AsyncStorage.setItem("themePreference", themeMode);
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  // Update status bar based on theme
  useEffect(() => {
    StatusBar.setBarStyle(
      theme.mode === "dark" ? "light-content" : "dark-content",
      true
    );
  }, [theme.mode]);

  const value = {
    theme,
    toggleTheme,
    setSpecificTheme,
    isLoading,
    isDark: theme.mode === "dark",
    isLight: theme.mode === "light",
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};