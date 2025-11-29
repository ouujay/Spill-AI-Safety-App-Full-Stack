// src/nav/AuthGate.js
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Text from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import { routeWithSelfieStatus } from "./routeWithSelfieStatus";

/**
 * AuthGate - Smart routing based on user authentication status
 * This should be your app's initial screen to properly route users
 */
export default function AuthGate({ navigation }) {
  const { theme } = useTheme();

  useEffect(() => {
    checkAuthAndRoute();
  }, []);

  const checkAuthAndRoute = async () => {
    try {
      console.log('AuthGate: Checking authentication status...');
      
      // 1. Check if onboarding has been completed
      const onboardingSeen = await AsyncStorage.getItem("onboardingComplete");
      if (!onboardingSeen) {
        console.log('AuthGate: Onboarding not completed, routing to Onboarding');
        navigation.replace("Onboarding");
        return;
      }

      // 2. Check if user has access token
      const token = await AsyncStorage.getItem("accessToken");
      if (!token) {
        console.log('AuthGate: No access token found, routing to Login');
        navigation.replace("Login");
        return;
      }

      // 3. User has token, use smart routing based on selfie status
      console.log('AuthGate: Token found, checking selfie status...');
      await routeWithSelfieStatus(navigation, "Login");
      
    } catch (error) {
      console.error("AuthGate error:", error);
      
      // If there's any error, clear tokens and default to login
      await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
      navigation.replace("Login");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Background gradient effect */}
      <View style={[styles.gradientCircle, { backgroundColor: theme.colors.accent + '10' }]} />
      
      <View style={styles.content}>
        <ActivityIndicator 
          size="large" 
          color={theme.colors.accent} 
          style={styles.loader}
        />
        <Text style={[styles.text, { color: theme.colors.text }]}>
          Checking your status...
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  gradientCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -100,
    right: -50,
  },
  content: {
    alignItems: 'center',
  },
  loader: {
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
});