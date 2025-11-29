import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { View, StyleSheet, Platform, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";

// Auth & flow screens
import SplashScreen from "../screens/SplashScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import SignUpScreen from "../screens/SignUpScreen";
import LoginScreen from "../screens/LoginScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import SelfieVerifyScreen from "../screens/SelfieVerifyScreen";
import RegisterFinalScreen from "../screens/RegisterFinalScreen";
import AppealScreen from "../screens/AppealScreen";
import AppealPendingScreen from "../screens/AppealPendingScreen";

// Main app screens
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ProfileScreen from "../screens/ProfileScreen";

// Detail screens - global level
import PostDetailScreen from "../screens/PostDetailScreen";
import ExploreListScreen from "../screens/ExploreListScreen";
import SavedPostsScreen from "../screens/SavedPostsScreen";
import MyPostsScreen from "../screens/MyPostsScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const tabIcons = {
  Home: { focused: "home", unfocused: "home-outline" },
  Search: { focused: "search", unfocused: "search-outline" },
  Notifications: { focused: "notifications", unfocused: "notifications-outline" },
  Profile: { focused: "person-circle", unfocused: "person-circle-outline" },
};

// Floating Action Button Component
function FloatingActionButton({ navigation, theme }) {
  const [scaleValue] = useState(new Animated.Value(1));

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
    navigation.navigate("Create");
  };

  return (
    <View style={styles.fabContainer}>
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.accent }]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function CustomTabBar({ state, descriptors, navigation, theme }) {
  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          shadowColor: theme.colors.text,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.regularTab,
              ]}
            >
              {isFocused ? (
                <View style={[styles.focusedTab, { backgroundColor: theme.colors.accent }]}>
                  <Ionicons
                    name={tabIcons[route.name].focused}
                    size={24}
                    color="#fff"
                  />
                </View>
              ) : (
                <Ionicons
                  name={tabIcons[route.name].unfocused}
                  size={24}
                  color={theme.colors.secondary}
                />
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Main tabs - no nested stacks, just direct screens
function MainTabsWithFAB({ navigation }) {
  const { theme } = useTheme();

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
        }}
        tabBar={(props) => <CustomTabBar {...props} theme={theme} />}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Notifications" component={NotificationsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
      
      <FloatingActionButton navigation={navigation} theme={theme} />
    </>
  );
}

export default function AppNavigator() {
  const { theme } = useTheme();

  const customTheme = {
    ...(theme.mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.colors.accent,
      background: theme.colors.primary,
      card: theme.colors.card,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.accent,
    },
  };

  const globalScreenOptions = {
    headerShown: false,
    animation: "slide_from_right",
    gestureEnabled: true,
    gestureDirection: "horizontal",
    cardStyle: { 
      backgroundColor: theme.colors.primary,
      flex: 1
    },
    animationTypeForReplace: 'push',
    gestureResponseDistance: 100,
    cardOverlayEnabled: false,
    cardShadowEnabled: false,
    presentation: 'card',
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.primary }}>
      <NavigationContainer theme={customTheme}>
        <Stack.Navigator
          screenOptions={globalScreenOptions}
          initialRouteName="Splash"
        >
          <Stack.Screen 
            name="Splash" 
            component={SplashScreen} 
            options={{ 
              animation: "fade",
              gestureEnabled: false,
            }} 
          />
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ 
              animation: "slide_from_bottom", 
              gestureEnabled: false,
            }}
          />
          <Stack.Screen 
            name="SignUp" 
            component={SignUpScreen} 
            options={{ 
              animation: "slide_from_right",
              gestureEnabled: true,
            }} 
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ 
              animation: "slide_from_left",
              gestureEnabled: true,
            }} 
          />
          <Stack.Screen 
            name="ForgotPassword" 
            component={ForgotPasswordScreen} 
            options={{ 
              animation: "slide_from_bottom",
              gestureEnabled: true,
            }} 
          />

          <Stack.Screen
            name="SelfieVerify"
            component={SelfieVerifyScreen}
            options={{ 
              animation: "slide_from_right", 
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="RegisterFinal"
            component={RegisterFinalScreen}
            options={{ 
              animation: "slide_from_right", 
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="AppealScreen"
            component={AppealScreen}
            options={{ 
              animation: "slide_from_bottom", 
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="AppealPending"
            component={AppealPendingScreen}
            options={{ 
              animation: "slide_from_right", 
              gestureEnabled: false,
            }}
          />

          <Stack.Screen 
            name="Main" 
            component={MainTabsWithFAB} 
            options={{ 
              animation: "fade", 
              gestureEnabled: false,
            }} 
          />

          <Stack.Screen 
            name="Create" 
            component={CreatePostScreen}
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
              gestureEnabled: true,
              gestureDirection: "vertical",
              headerShown: false,
            }}
          />

          <Stack.Screen 
            name="PostDetail" 
            component={PostDetailScreen}
            options={{
              animation: "slide_from_right",
              gestureEnabled: true,
              presentation: "card",
              headerShown: false,
              fullScreenGestureEnabled: true,
              gestureResponseDistance: 50,
            }}
          />
          
          <Stack.Screen 
            name="ExploreList" 
            component={ExploreListScreen}
            options={{
              animation: "slide_from_right",
              gestureEnabled: true,
              presentation: "card",
              headerShown: false,
              headerTransparent: true,
            }}
          />

          <Stack.Screen 
            name="SavedPosts" 
            component={SavedPostsScreen}
            options={{
              animation: "slide_from_right",
              gestureEnabled: true,
              presentation: "card",
              headerShown: false,
            }}
          />

          <Stack.Screen 
            name="MyPosts" 
            component={MyPostsScreen}
            options={{
              animation: "slide_from_right",
              gestureEnabled: true,
              presentation: "card",
              headerShown: false,
              fullScreenGestureEnabled: true,
              gestureResponseDistance: 50,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: 70,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderTopWidth: 0,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 20,
    borderRadius: 35, // Larger pill shape
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },
  tabItem: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  regularTab: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
    minHeight: 48,
    position: "relative",
  },
  focusedTab: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: { 
    position: "absolute", 
    bottom: -12, 
    width: 4, 
    height: 4, 
    borderRadius: 2 
  },
  
  // FAB styles
  fabContainer: {
    position: "absolute",
    bottom: 120, // Back down closer to tab bar
    right: 30,
    zIndex: 1000,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: "#fff",
  },
});