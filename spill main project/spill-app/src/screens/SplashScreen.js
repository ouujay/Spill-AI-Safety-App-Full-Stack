import React, { useEffect, useRef } from "react";
import { View, Image, StyleSheet, Animated, Dimensions } from "react-native";
import Text from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { routeWithSelfieStatus } from "../nav/routeWithSelfieStatus";

const { width } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Check onboarding/token after animation
    setTimeout(() => {
      checkAuthAndRoute();
    }, 1800);
  }, []);

  const checkAuthAndRoute = async () => {
    try {
      console.log("SplashScreen: Starting authentication check...");
      
      // 1. FIRST PRIORITY: Check if user has access token (logged in user)
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        console.log("SplashScreen: Token found, routing to main app...");
        await routeWithSelfieStatus(navigation, "Main");
        return;
      }

      // 2. SECOND PRIORITY: No token, but check if they've completed onboarding before
      const onboardingSeen = await AsyncStorage.getItem("onboardingComplete");
      if (onboardingSeen) {
        console.log("SplashScreen: No token but onboarding completed, routing to Login");
        navigation.replace("Login");
        return;
      }

      // 3. LAST PRIORITY: First time user - show onboarding
      console.log("SplashScreen: First time user, routing to Onboarding");
      navigation.replace("Onboarding");
      
    } catch (error) {
      console.error("Error in splash screen routing:", error);
      // If there's any error, default to login
      navigation.replace("Login");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Background gradient effect */}
      <View
        style={[
          styles.gradientCircle,
          { backgroundColor: theme.colors.accent + "10" },
        ]}
      />
      <View
        style={[
          styles.gradientCircle2,
          { backgroundColor: theme.colors.accent + "05" },
        ]}
      />

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Subtle glow effect behind logo */}
        <View style={[styles.glowEffect, { backgroundColor: theme.colors.accent + "15" }]} />
        <View style={[styles.glowEffect2, { backgroundColor: theme.colors.accent + "08" }]} />
        
        <Image
          source={require("../../assets/logo.png")}
          style={[styles.logo, { 
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
          }]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>Spill</Text>
        <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
          Where the tea gets spilled.
        </Text>
      </Animated.View>

      {/* Loading indicator */}
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        <View
          style={[
            styles.loadingBar,
            { backgroundColor: theme.colors.accent + "20" },
          ]}
        >
          <Animated.View
            style={[
              styles.loadingProgress,
              { backgroundColor: theme.colors.accent },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gradientCircle: {
    position: "absolute",
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    top: -width * 0.3,
    right: -width * 0.2,
  },
  gradientCircle2: {
    position: "absolute",
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    bottom: -width * 0.2,
    left: -width * 0.1,
  },
  logoContainer: {
    marginBottom: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.6,
  },
  glowEffect2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.3,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 20,
    zIndex: 1,
  },
  textContainer: {
    alignItems: "center",
    marginBottom: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    position: "absolute",
    bottom: 80,
    width: width * 0.6,
  },
  loadingBar: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  loadingProgress: {
    height: "100%",
    width: "70%",
    borderRadius: 2,
  },
});