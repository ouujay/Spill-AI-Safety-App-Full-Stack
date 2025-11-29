// services/NotificationService.js - Fixed version
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  static async registerForPushNotifications() {
    let token;

    console.log('🔔 Starting push notification registration...');

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
      console.log('📱 Android notification channel configured');
    }

    if (Device.isDevice) {
      console.log('📱 Device detected, requesting permissions...');
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      console.log('🔐 Existing permission status:', existingStatus);
      
      if (existingStatus !== 'granted') {
        console.log('🔐 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('🔐 Permission request result:', status);
      }
      
      if (finalStatus !== 'granted') {
        console.warn('❌ Push notification permissions denied');
        throw new Error('Push notification permissions denied');
      }
      
      console.log('✅ Push notification permissions granted');
      
      try {
        // Get the Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        
        token = tokenData.data;
        console.log('🎫 Push token obtained:', token);
        
        // Store token locally for debugging
        await AsyncStorage.setItem('expoPushToken', token);
        
      } catch (tokenError) {
        console.error('❌ Error getting push token:', tokenError);
        throw new Error(`Failed to get push token: ${tokenError.message}`);
      }
      
    } else {
      console.warn('❌ Must use physical device for Push Notifications');
      throw new Error('Push notifications require a physical device');
    }

    return token;
  }

  static async sendTokenToBackend(token) {
    try {
      console.log('📤 Sending token to backend...');
      
      // CRITICAL FIX: Use 'accessToken' instead of 'authToken'
      const authToken = await AsyncStorage.getItem('accessToken');
      
      if (!authToken) {
        console.warn('❌ No auth token found, cannot register push token');
        throw new Error('Authentication required to register push token');
      }

      console.log('🔐 Auth token found, registering with backend...');

      const requestBody = {
        token,
        platform: Platform.OS,
      };

      console.log('📤 Request body:', requestBody);

      const response = await fetch(`${API_BASE_URL}/api/notifications/register-token/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📤 Backend response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Backend registration failed:', errorText);
        throw new Error(`Failed to register token: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('✅ Token registered successfully:', responseData);
      
      // Store registration status
      await AsyncStorage.setItem('pushTokenRegistered', 'true');
      
      return responseData;

    } catch (error) {
      console.error('❌ Error registering token with backend:', error);
      throw error;
    }
  }

  static setupNotificationListeners() {
    console.log('👂 Setting up notification listeners...');

    // Handle notifications when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received in foreground:', notification);
      
      // You can customize foreground notification display here
      // For example, show a custom in-app notification
    });

    // Handle notification taps when app is in background/closed
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      
      // Handle navigation based on notification data
      const data = response.notification.request.content.data;
      console.log('📋 Notification data:', data);
      
      // You can implement navigation logic here
      if (data?.postId) {
        console.log('🧭 Should navigate to post:', data.postId);
        // NavigationService.navigate('PostDetail', { postId: data.postId });
      } else if (data?.type) {
        console.log('🧭 Should handle notification type:', data.type);
        // Handle different notification types
      }
    });

    console.log('✅ Notification listeners set up successfully');

    // Return cleanup function
    return () => {
      console.log('🧹 Cleaning up notification listeners...');
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }

  // Utility function to check if notifications are properly set up
  static async checkNotificationStatus() {
    try {
      console.log('🔍 Checking notification status...');
      
      // Check device support
      if (!Device.isDevice) {
        console.log('❌ Not a physical device');
        return { status: 'unsupported', reason: 'Requires physical device' };
      }

      // Check permissions
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Permissions not granted:', status);
        return { status: 'no_permission', reason: `Permission status: ${status}` };
      }

      // Check if token is registered
      const tokenRegistered = await AsyncStorage.getItem('pushTokenRegistered');
      const storedToken = await AsyncStorage.getItem('expoPushToken');
      
      console.log('✅ Notification status check complete:', {
        permissions: status,
        tokenRegistered: !!tokenRegistered,
        hasStoredToken: !!storedToken,
      });

      return {
        status: 'ready',
        permissions: status,
        tokenRegistered: !!tokenRegistered,
        hasStoredToken: !!storedToken,
        storedToken: storedToken?.substring(0, 20) + '...',
      };

    } catch (error) {
      console.error('❌ Error checking notification status:', error);
      return { status: 'error', reason: error.message };
    }
  }

  // Test function to send a test notification (for debugging)
  static async sendTestNotification() {
    try {
      console.log('🧪 Sending test notification...');
      
      const authToken = await AsyncStorage.getItem('accessToken');
      if (!authToken) {
        throw new Error('No auth token');
      }

      const response = await fetch(`${API_BASE_URL}/api/notifications/test/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Test notification failed: ${response.status}`);
      }

      console.log('✅ Test notification sent');
      return await response.json();

    } catch (error) {
      console.error('❌ Test notification failed:', error);
      throw error;
    }
  }
}