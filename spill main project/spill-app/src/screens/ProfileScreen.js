// screens/ProfileScreen.js - Updated with working My Posts navigation
import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { getUserProfile } from "../api/user";
import { logout } from "../api/auth";
import { handleLogout } from "../utils/authHelper";

export default function ProfileScreen({ navigation }) {
  const { theme, toggleTheme } = useTheme();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error("Error loading profile:", error);
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    try {
      await logout();
      await handleLogout();
      navigation.replace("Login");
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, clear local storage and redirect
      await handleLogout();
      navigation.replace("Login");
    }
  };

  // Handle saved posts navigation
  const handleSavedPostsPress = () => {
    navigation.navigate("SavedPosts");
  };

  // NEW: Handle my posts navigation
  const handleMyPostsPress = () => {
    navigation.navigate("MyPosts");
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer, { backgroundColor: theme.colors.primary }]}>
        <Ionicons name="person-circle" size={48} color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading profile...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Profile
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {userProfile?.avatar ? (
              <Image source={{ uri: userProfile.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.avatarText}>
                  {userProfile?.name?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {userProfile?.name || 'Unknown User'}
            </Text>
            
            {userProfile?.email && (
              <Text style={[styles.userEmail, { color: theme.colors.secondary }]}>
                {userProfile.email}
              </Text>
            )}
            
            {userProfile?.university && (
              <View style={styles.universityContainer}>
                <Ionicons name="school" size={16} color={theme.colors.accent} />
                <Text style={[styles.universityText, { color: theme.colors.secondary }]}>
                  {userProfile.university.name || userProfile.university}
                </Text>
              </View>
            )}

            {userProfile?.verification_status && (
              <View style={styles.verificationContainer}>
                <Ionicons 
                  name={userProfile.verification_status === 'verified' ? 'checkmark-circle' : 'time'} 
                  size={16} 
                  color={userProfile.verification_status === 'verified' ? '#22c55e' : '#f59e0b'} 
                />
                <Text style={[
                  styles.verificationText, 
                  { color: userProfile.verification_status === 'verified' ? '#22c55e' : '#f59e0b' }
                ]}>
                  {userProfile.verification_status === 'verified' ? 'Verified' : 'Pending Verification'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Section */}
        {userProfile?.stats && (
          <View style={[styles.statsSection, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {userProfile.stats.posts_count || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.secondary }]}>
                Posts
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {userProfile.stats.upvotes_received || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.secondary }]}>
                Upvotes
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {userProfile.stats.saved_posts || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.secondary }]}>
                Saved
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {/* Saved Posts Button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
            onPress={handleSavedPostsPress}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons name="bookmark" size={24} color={theme.colors.accent} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                  Saved Posts
                </Text>
                <Text style={[styles.actionSubtitle, { color: theme.colors.secondary }]}>
                  View your bookmarked posts
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>

          {/* Edit Profile Button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              // TODO: Navigate to edit profile
              Alert.alert("Coming Soon", "Edit profile functionality coming soon!");
            }}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons name="person" size={24} color={theme.colors.accent} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                  Edit Profile
                </Text>
                <Text style={[styles.actionSubtitle, { color: theme.colors.secondary }]}>
                  Update your information
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>

          {/* My Posts Button - UPDATED with working navigation */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
            onPress={handleMyPostsPress}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons name="document-text" size={24} color={theme.colors.accent} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                  My Posts
                </Text>
                <Text style={[styles.actionSubtitle, { color: theme.colors.secondary }]}>
                  View posts you've created
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Settings
          </Text>

          {/* Theme Toggle */}
          <TouchableOpacity
            style={[styles.settingButton, { backgroundColor: theme.colors.surface }]}
            onPress={toggleTheme}
          >
            <View style={styles.settingContent}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons 
                  name={theme.mode === 'dark' ? 'moon' : 'sunny'} 
                  size={20} 
                  color={theme.colors.accent} 
                />
              </View>
              <Text style={[styles.settingText, { color: theme.colors.text }]}>
                {theme.mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Text>
              <View style={[
                styles.toggle, 
                { backgroundColor: theme.mode === 'dark' ? theme.colors.accent : theme.colors.border }
              ]}>
                <View style={[
                  styles.toggleIndicator,
                  { 
                    backgroundColor: '#fff',
                    transform: [{ translateX: theme.mode === 'dark' ? 16 : 2 }]
                  }
                ]} />
              </View>
            </View>
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            style={[styles.settingButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              Alert.alert("Coming Soon", "Notification settings coming soon!");
            }}
          >
            <View style={styles.settingContent}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons name="notifications" size={20} color={theme.colors.accent} />
              </View>
              <Text style={[styles.settingText, { color: theme.colors.text }]}>
                Notifications
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>

          {/* Privacy */}
          <TouchableOpacity
            style={[styles.settingButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              Alert.alert("Coming Soon", "Privacy settings coming soon!");
            }}
          >
            <View style={styles.settingContent}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.accent} />
              </View>
              <Text style={[styles.settingText, { color: theme.colors.text }]}>
                Privacy & Safety
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={[styles.settingButton, { backgroundColor: theme.colors.surface }]}
            onPress={() => {
              Alert.alert("Coming Soon", "Help & support coming soon!");
            }}
          >
            <View style={styles.settingContent}>
              <View style={[styles.settingIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons name="help-circle" size={20} color={theme.colors.accent} />
              </View>
              <Text style={[styles.settingText, { color: theme.colors.text }]}>
                Help & Support
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: '#ef444415' }]}
          onPress={handleLogoutPress}
        >
          <Ionicons name="log-out" size={20} color="#ef4444" />
          <Text style={[styles.logoutText, { color: '#ef4444' }]}>
            Sign Out
          </Text>
        </TouchableOpacity>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },

  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },

  content: {
    flex: 1,
  },

  profileHeader: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },

  avatarContainer: {
    marginBottom: 16,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },

  userInfo: {
    alignItems: 'center',
  },

  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },

  userEmail: {
    fontSize: 16,
    marginBottom: 8,
  },

  universityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },

  universityText: {
    fontSize: 14,
    fontWeight: '500',
  },

  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  verificationText: {
    fontSize: 14,
    fontWeight: '600',
  },

  statsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

  actionsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },

  actionButton: {
    borderRadius: 16,
    padding: 16,
  },

  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  actionTextContainer: {
    flex: 1,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },

  actionSubtitle: {
    fontSize: 14,
  },

  settingsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },

  settingButton: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },

  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  settingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },

  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  logoutButton: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },

  bottomSpacing: {
    height: 100,
  },
});