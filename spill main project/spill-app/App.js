// App.js - Updated to remove push notifications from initialization
import React, { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
import { ThemeProvider, useTheme } from "./src/theme/ThemeProvider";
import AppNavigator from "./src/navigation/AppNavigator";
import { initializeAuth } from "./src/utils/authHelper";
import { NotificationService } from "./src/services/NotificationService";
import Text from "./src/components/Text";

// Loading component for app initialization
function AppInitializer({ children }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    let cleanupNotifications;

    const initializeApp = async () => {
      try {
        console.log('App: Starting initialization...');
        
        // ONLY initialize auth - don't do push notifications yet
        await initializeAuth();
        console.log('App: Auth initialized successfully');

        // Setup notification listeners (this doesn't require authentication)
        try {
          cleanupNotifications = NotificationService.setupNotificationListeners();
          console.log('App: Notification listeners set up successfully');
        } catch (listenerError) {
          console.warn('App: Notification listeners setup failed:', listenerError);
        }

        console.log('App: Initialization completed successfully');
      } catch (error) {
        console.error('App: Critical initialization error:', error);
        setInitError(error.message || 'Failed to initialize app');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();

    // Cleanup function
    return () => {
      if (cleanupNotifications) {
        try {
          cleanupNotifications();
        } catch (error) {
          console.warn('App: Cleanup error:', error);
        }
      }
    };
  }, []);

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.primary
      }}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={{
          marginTop: 16,
          color: theme.colors.text,
          fontSize: 16,
          opacity: 0.7
        }}>
          Initializing app...
        </Text>
      </View>
    );
  }

  // Show error screen if initialization failed
  if (initError) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 20
      }}>
        <Text style={{
          color: theme.colors.text,
          fontSize: 18,
          fontWeight: 'bold',
          marginBottom: 8,
          textAlign: 'center'
        }}>
          Initialization Failed
        </Text>
        <Text style={{
          color: theme.colors.secondary,
          fontSize: 14,
          textAlign: 'center',
          opacity: 0.8
        }}>
          {initError}
        </Text>
        <Text style={{
          color: theme.colors.secondary,
          fontSize: 12,
          textAlign: 'center',
          marginTop: 16,
          opacity: 0.6
        }}>
          Please restart the app
        </Text>
      </View>
    );
  }

  // Render app once initialization is complete
  return children;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInitializer>
          <AppNavigator />
        </AppInitializer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}