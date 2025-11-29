// utils/userUtils.js - User-related utility functions
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get current user ID from storage
export const getCurrentUserId = async () => {
  try {
    const userId = await AsyncStorage.getItem('currentUserId');
    return userId ? parseInt(userId) : null;
  } catch (error) {
    console.error('Failed to get current user ID:', error);
    return null;
  }
};

// Set current user ID in storage
export const setCurrentUserId = async (userId) => {
  try {
    if (userId) {
      await AsyncStorage.setItem('currentUserId', String(userId));
    } else {
      await AsyncStorage.removeItem('currentUserId');
    }
  } catch (error) {
    console.error('Failed to set current user ID:', error);
  }
};

// Get current user profile from storage
export const getCurrentUserProfile = async () => {
  try {
    const profile = await AsyncStorage.getItem('currentUserProfile');
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error('Failed to get current user profile:', error);
    return null;
  }
};

// Set current user profile in storage
export const setCurrentUserProfile = async (profile) => {
  try {
    if (profile) {
      await AsyncStorage.setItem('currentUserProfile', JSON.stringify(profile));
      // Also store the user ID for quick access
      if (profile.id) {
        await setCurrentUserId(profile.id);
      }
    } else {
      await AsyncStorage.removeItem('currentUserProfile');
      await AsyncStorage.removeItem('currentUserId');
    }
  } catch (error) {
    console.error('Failed to set current user profile:', error);
  }
};

// Clear all user data
export const clearUserData = async () => {
  try {
    await AsyncStorage.multiRemove([
      'currentUserId',
      'currentUserProfile',
      'accessToken',
      'refreshToken'
    ]);
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
};