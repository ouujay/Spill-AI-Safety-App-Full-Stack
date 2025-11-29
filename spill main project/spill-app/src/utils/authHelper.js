// utils/authHelper.js - Enhanced version with complete auth management
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api/client";

/**
 * Initialize auth token on app startup
 * This ensures the API client has proper auth headers set up
 */
export const initializeAuth = async () => {
  try {
    console.log('AuthHelper: Initializing authentication...');
    
    const token = await AsyncStorage.getItem("accessToken");
    if (token) {
      // Set the default auth header for all API requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log("AuthHelper: Auth token found and set in API client");
      return token;
    } else {
      // Clear any existing auth header
      delete api.defaults.headers.common['Authorization'];
      console.log("AuthHelper: No auth token found");
      return null;
    }
  } catch (error) {
    console.error("AuthHelper: Error initializing auth:", error);
    // Clear auth header on error
    delete api.defaults.headers.common['Authorization'];
    return null;
  }
};

/**
 * Handle successful login/register
 * Stores tokens and sets up API client for authenticated requests
 */
export const handleAuthSuccess = async (authData) => {
  try {
    console.log('AuthHelper: Handling authentication success...');
    
    const { access, refresh } = authData;
    
    if (!access || !refresh) {
      throw new Error("Missing access or refresh token in auth data");
    }
    
    // Store tokens in AsyncStorage
    await AsyncStorage.setItem("accessToken", access);
    await AsyncStorage.setItem("refreshToken", refresh);
    
    // Set auth header for immediate use
    api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
    
    console.log("AuthHelper: Auth success handled - tokens stored and API client updated");
    return true;
  } catch (error) {
    console.error("AuthHelper: Error handling auth success:", error);
    return false;
  }
};

/**
 * Handle logout
 * Clears all auth data and removes API client auth headers
 */
export const handleLogout = async () => {
  try {
    console.log('AuthHelper: Handling logout...');
    
    // Clear auth header immediately
    delete api.defaults.headers.common['Authorization'];
    
    // Clear stored tokens
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
    
    console.log("AuthHelper: Logout handled - tokens cleared and API client reset");
    return true;
  } catch (error) {
    console.error("AuthHelper: Error handling logout:", error);
    return false;
  }
};

/**
 * Update access token after refresh
 * Called by API interceptor when token is refreshed
 */
export const updateAccessToken = async (newToken) => {
  try {
    console.log('AuthHelper: Updating access token...');
    
    if (!newToken) {
      throw new Error("No token provided for update");
    }
    
    // Store new token
    await AsyncStorage.setItem("accessToken", newToken);
    
    // Update API client header
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    
    console.log("AuthHelper: Access token updated successfully");
    return true;
  } catch (error) {
    console.error("AuthHelper: Error updating access token:", error);
    return false;
  }
};

/**
 * Clear auth data when tokens become invalid
 * Called by API interceptor when refresh fails
 */
export const clearAuthData = async () => {
  try {
    console.log('AuthHelper: Clearing invalid auth data...');
    
    // Clear API client auth header
    delete api.defaults.headers.common['Authorization'];
    
    // Clear stored tokens
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
    
    console.log("AuthHelper: Auth data cleared successfully");
    return true;
  } catch (error) {
    console.error("AuthHelper: Error clearing auth data:", error);
    return false;
  }
};

/**
 * Check if user is authenticated by checking for access token
 * @returns {Promise<boolean>} True if user has access token
 */
export const isAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem("accessToken");
    return !!token;
  } catch (error) {
    console.error("AuthHelper: Error checking auth status:", error);
    return false;
  }
};

/**
 * Get current access token
 * @returns {Promise<string|null>} Current access token or null
 */
export const getAccessToken = async () => {
  try {
    return await AsyncStorage.getItem("accessToken");
  } catch (error) {
    console.error("AuthHelper: Error getting access token:", error);
    return null;
  }
};

/**
 * Get current refresh token
 * @returns {Promise<string|null>} Current refresh token or null
 */
export const getRefreshToken = async () => {
  try {
    return await AsyncStorage.getItem("refreshToken");
  } catch (error) {
    console.error("AuthHelper: Error getting refresh token:", error);
    return null;
  }
};

/**
 * Validate if current token is still valid by making a test request
 * @returns {Promise<boolean>} True if token is valid, false otherwise
 */
export const validateToken = async () => {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.log("AuthHelper: No token to validate");
      return false;
    }

    console.log("AuthHelper: Validating token...");
    
    // Make a lightweight request to check token validity
    // You can replace this with any endpoint that requires auth
    const response = await api.get("/profile/");
    
    console.log("AuthHelper: Token is valid");
    return response.status === 200;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("AuthHelper: Token is invalid or expired");
      return false;
    }
    
    // For network errors or other issues, assume token is still valid
    // This prevents unnecessary logouts due to temporary connectivity issues
    console.warn("AuthHelper: Could not validate token due to error, assuming valid:", error.message);
    return true;
  }
};

/**
 * Check if user has completed onboarding
 * @returns {Promise<boolean>} True if onboarding is complete
 */
export const hasCompletedOnboarding = async () => {
  try {
    const onboardingComplete = await AsyncStorage.getItem("onboardingComplete");
    return !!onboardingComplete;
  } catch (error) {
    console.error("AuthHelper: Error checking onboarding status:", error);
    return false;
  }
};

/**
 * Mark onboarding as complete
 * @returns {Promise<boolean>} True if successful
 */
export const completeOnboarding = async () => {
  try {
    await AsyncStorage.setItem("onboardingComplete", "true");
    console.log("AuthHelper: Onboarding marked as complete");
    return true;
  } catch (error) {
    console.error("AuthHelper: Error completing onboarding:", error);
    return false;
  }
};

/**
 * Reset all app data (for development/testing)
 * Clears all tokens and onboarding status
 */
export const resetAppData = async () => {
  try {
    console.log('AuthHelper: Resetting all app data...');
    
    // Clear API client auth header
    delete api.defaults.headers.common['Authorization'];
    
    // Clear all stored data
    await AsyncStorage.multiRemove([
      "accessToken", 
      "refreshToken", 
      "onboardingComplete"
    ]);
    
    console.log("AuthHelper: App data reset successfully");
    return true;
  } catch (error) {
    console.error("AuthHelper: Error resetting app data:", error);
    return false;
  }
};