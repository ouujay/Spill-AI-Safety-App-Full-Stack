// theme/navigationTheme.js
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const createNavigationTheme = (appTheme) => {
  const isDark = appTheme.mode === 'dark';
  
  return {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      // These are the KEY properties that control the animation backgrounds
      primary: appTheme.colors.accent,
      background: appTheme.colors.primary, // Main background behind animations
      card: appTheme.colors.card, // Tab bar and header backgrounds  
      text: appTheme.colors.text,
      border: appTheme.colors.border,
      notification: appTheme.colors.accent,
      
      // Additional React Navigation specific colors that prevent white flash
      surface: appTheme.colors.primary, // Surface color for cards/modals
    },
  };
};

// Custom screen options that prevent white flash during all animations
export const createScreenOptions = (theme) => ({
  headerShown: false,
  animation: "slide_from_right",
  gestureEnabled: true,
  gestureDirection: "horizontal",
  
  // CRITICAL: Card styling prevents white background during animations
  cardStyle: { 
    backgroundColor: theme.colors.primary,
    flex: 1,
  },
  
  // Animation optimizations
  animationTypeForReplace: 'push',
  gestureResponseDistance: 100,
  
  // Prevent overlay effects that can cause flashing
  cardOverlayEnabled: false,
  cardShadowEnabled: false,
  
  // Ensure smooth transitions
  presentation: 'card',
  
  // Custom interpolation to ensure background stays consistent
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        backgroundColor: theme.colors.primary, // Maintain background during animation
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
    };
  },
});

// Special options for specific animation types
export const slideFromBottomOptions = (theme) => ({
  animation: "slide_from_bottom",
  gestureEnabled: true,
  gestureDirection: "vertical",
  cardStyle: { 
    backgroundColor: theme.colors.primary,
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        backgroundColor: theme.colors.primary,
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.height, 0],
            }),
          },
        ],
      },
    };
  },
});

export const fadeOptions = (theme) => ({
  animation: "fade",
  cardStyle: { 
    backgroundColor: theme.colors.primary,
  },
  cardStyleInterpolator: ({ current }) => {
    return {
      cardStyle: {
        backgroundColor: theme.colors.primary,
        opacity: current.progress,
      },
    };
  },
});