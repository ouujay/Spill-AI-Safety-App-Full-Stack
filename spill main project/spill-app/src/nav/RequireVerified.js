import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import Text from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import { getSelfieStatus } from "../api/user";
import { routeWithSelfieStatus, isAuthenticated } from "./routeWithSelfieStatus";

/**
 * HOC component that ensures user is verified before showing protected content
 * Automatically redirects unverified users to appropriate verification screen
 */
export default function RequireVerified({ navigation, children }) {
  const [verificationState, setVerificationState] = useState('checking'); // 'checking', 'verified', 'redirecting'
  const { theme } = useTheme();

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      // First check if user is authenticated
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        console.log("RequireVerified: User not authenticated, redirecting to login");
        setVerificationState('redirecting');
        navigation.replace("Login");
        return;
      }

      // Check verification status
      const status = await getSelfieStatus();
      console.log("RequireVerified: Selfie status:", status);
      
      if (status.selfie_verified === true) {
        console.log("RequireVerified: User is verified, showing protected content");
        setVerificationState('verified');
      } else {
        console.log("RequireVerified: User not verified, redirecting");
        setVerificationState('redirecting');
        // User is not verified, redirect using smart routing
        await routeWithSelfieStatus(navigation);
      }
    } catch (error) {
      console.error("RequireVerified: Error checking verification status:", error);
      setVerificationState('redirecting');
      
      // Handle different error types
      if (error?.response?.status === 401) {
        navigation.replace("Login");
      } else {
        // For other errors, use smart routing to determine where to go
        await routeWithSelfieStatus(navigation, "Login");
      }
    }
  };

  // Show loading while checking
  if (verificationState === 'checking') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
          Checking verification status...
        </Text>
      </View>
    );
  }

  // Show loading while redirecting
  if (verificationState === 'redirecting') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
          Redirecting...
        </Text>
      </View>
    );
  }

  // Only render children if verified
  return verificationState === 'verified' ? children : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
});