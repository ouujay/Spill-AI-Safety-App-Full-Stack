import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./client";

// REGISTER - expects: {email, date_of_birth, university, password}
export const register = async (data) => {
  try {
    const response = await api.post("/register/", data);
    
    // Store tokens if they're returned
    if (response.data.access) {
      await AsyncStorage.setItem("accessToken", response.data.access);
    }
    if (response.data.refresh) {
      await AsyncStorage.setItem("refreshToken", response.data.refresh);
    }
    
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.response?.data?.message ||
      "Registration failed. Please try again."
    );
  }
};

// LOGIN - expects: {email, password}
export const login = async ({ email, password }) => {
  try {
    const response = await api.post("/login/", { email, password });
    const { access, refresh } = response.data;
    
    // Store tokens
    await AsyncStorage.setItem("accessToken", access);
    await AsyncStorage.setItem("refreshToken", refresh);
    
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.response?.data?.message ||
      "Login failed. Please check your credentials."
    );
  }
};

// LOGOUT - blacklists refresh token and clears local storage
export const logout = async () => {
  try {
    const refresh = await AsyncStorage.getItem("refreshToken");
    if (refresh) {
      // Try to blacklist token on server, but don't fail if it doesn't work
      try {
        await api.post("/logout/", { refresh });
      } catch (err) {
        console.warn("Failed to blacklist refresh token:", err.message);
      }
    }
  } catch (err) {
    console.warn("Error during logout:", err.message);
  } finally {
    // Always clear local tokens
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
  }
};

// REFRESH TOKEN
export const refreshAccessToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    
    const response = await api.post("/token/refresh/", { refresh: refreshToken });
    const { access } = response.data;
    
    await AsyncStorage.setItem("accessToken", access);
    return access;
  } catch (err) {
    // Clear tokens if refresh fails
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
    throw new Error("Session expired. Please log in again.");
  }
};

// CHECK AUTH STATUS
export const checkAuthStatus = async () => {
  try {
    const token = await AsyncStorage.getItem("accessToken");
    if (!token) return false;
    
    // Optionally verify token with server
    const response = await api.get("/profile/");
    return response.status === 200;
  } catch (err) {
    // Token might be expired, try refresh
    try {
      await refreshAccessToken();
      return true;
    } catch (refreshErr) {
      return false;
    }
  }
};