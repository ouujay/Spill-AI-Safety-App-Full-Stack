// src/components/FloatingActionButton.js
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export default function FloatingActionButton({ onPress }) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [scaleValue] = useState(new Animated.Value(1));

  // Don't show FAB for guests
  if (!user || user.account_type === 'guest') {
    return null;
  }

  const getButtonConfig = () => {
    switch (user.account_type) {
      case 'agent':
        return {
          icon: 'add',
          label: 'Add Property',
          bgColor: theme.colors.primary,
        };
      case 'service':
        return {
          icon: 'construct',
          label: 'Add Service',
          bgColor: theme.colors.secondary,
        };
      default:
        return null;
    }
  };

  const buttonConfig = getButtonConfig();
  
  if (!buttonConfig) return null;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    handlePressOut();
    onPress();
  };

  const styles = {
    container: {
      position: 'absolute',
      // Position above the floating tab bar
      bottom: 130, // Tab bar is at bottom: 40, height: 65, so 40 + 65 + 25 = 130
      right: 30,
      zIndex: 1000,
    },
    fabButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: buttonConfig.bgColor,
      alignItems: 'center',
      justifyContent: 'center',
      // Enhanced shadow for better floating effect
      shadowColor: buttonConfig.bgColor,
      shadowOffset: { 
        width: 0, 
        height: 8 
      },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 12,
      // Add a subtle border for polish
      borderWidth: 3,
      borderColor: theme.colors.white,
    },
    fabIcon: {
      color: theme.colors.white,
    },
    // Pulse effect ring (optional)
    pulseRing: {
      position: 'absolute',
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: buttonConfig.bgColor,
      opacity: 0.2,
    },
  };

  return (
    <View style={styles.container}>
      {/* Optional pulse ring for extra flair */}
      <View style={styles.pulseRing} />
      
      <Animated.View
        style={{
          transform: [{ scale: scaleValue }],
        }}
      >
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel={buttonConfig.label}
        >
          <Ionicons 
            name={buttonConfig.icon} 
            size={30} 
            style={styles.fabIcon}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}