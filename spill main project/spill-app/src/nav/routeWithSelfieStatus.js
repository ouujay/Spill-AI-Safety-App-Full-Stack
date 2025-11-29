import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSelfieStatus } from "../api/user";

/**
 * Smart routing based on user's selfie verification status
 * Call this after login/register or app startup
 * 
 * @param {object} navigation - React Navigation object
 * @param {string} fallbackScreen - Screen to navigate to if no token or error (default: "Login")
 */
export async function routeWithSelfieStatus(navigation, fallbackScreen = "Login") {
  try {
    // First check if we have a token
    const token = await AsyncStorage.getItem("accessToken");
    if (!token) {
      console.log("No access token found, redirecting to", fallbackScreen);
      navigation.replace(fallbackScreen);
      return;
    }

    console.log("Fetching selfie status...");
    const status = await getSelfieStatus();
    
    console.log("Selfie status received:", status);
    
    // Priority 1: User is fully verified - go to main app
    if (status.selfie_verified === true) {
      console.log("User is verified, routing to Main");
      navigation.replace("Main");
      return;
    }
    
    // Priority 2: User has submitted appeal - show pending screen
    if (status.appeal_requested === true) {
      console.log("Appeal requested, routing to AppealPending");
      navigation.replace("AppealPending");
      return;
    }
    
    // Priority 3: User is locked but hasn't appealed yet - show appeal form
    if (status.locked === true) {
      console.log("User is locked, routing to AppealScreen");
      navigation.replace("AppealScreen");
      return;
    }
    
    // Priority 4: User needs to verify selfie (default case)
    const attemptsLeft = Math.max(0, 3 - (status.retry_count || 0));
    console.log(`User needs verification, ${attemptsLeft} attempts left`);
    navigation.replace("SelfieVerify", { 
      attemptsLeft: attemptsLeft,
      retryCount: status.retry_count || 0
    });
    
  } catch (error) {
    console.error("Error in routeWithSelfieStatus:", error);
    
    // Handle specific error types
    if (error?.response?.status === 401) {
      // Token is invalid/expired, clear storage and redirect to login
      console.log("Token expired, clearing storage and redirecting to login");
      await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
      navigation.replace("Login");
    } else if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
      // Network error - could be temporary, redirect to fallback but keep token
      console.log("Network error, redirecting to", fallbackScreen);
      navigation.replace(fallbackScreen);
    } else {
      // Other errors - clear tokens to be safe and redirect to login
      console.log("Unknown error, clearing storage and redirecting to login");
      await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
      navigation.replace("Login");
    }
  }
}

/**
 * Check if user is authenticated by checking for access token
 * @returns {boolean} True if user has access token
 */
export async function isAuthenticated() {
  try {
    const token = await AsyncStorage.getItem("accessToken");
    return !!token;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return false;
  }
}

/**
 * Check if user has completed onboarding
 * @returns {boolean} True if onboarding is complete
 */
export async function hasCompletedOnboarding() {
  try {
    const onboardingComplete = await AsyncStorage.getItem("onboardingComplete");
    return !!onboardingComplete;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return false;
  }
}

/**
 * Complete app startup routing including onboarding check
 * Use this in your AuthGate or Splash screen
 * 
 * @param {object} navigation - React Navigation object
 */
export async function completeAppStartupRouting(navigation) {
  try {
    console.log("Starting app routing check...");
    
    // 1. Check onboarding first
    const onboardingDone = await hasCompletedOnboarding();
    if (!onboardingDone) {
      console.log("Onboarding not completed, routing to Onboarding");
      navigation.replace("Onboarding");
      return;
    }
    
    // 2. Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      console.log("User not authenticated, routing to Login");
      navigation.replace("Login");
      return;
    }
    
    // 3. User is authenticated, check selfie status and route accordingly
    await routeWithSelfieStatus(navigation, "Login");
    
  } catch (error) {
    console.error("Error in completeAppStartupRouting:", error);
    // Fallback to login on any error
    navigation.replace("Login");
  }
}