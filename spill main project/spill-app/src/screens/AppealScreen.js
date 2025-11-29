import React, { useState } from "react";
import { View, TextInput, Alert, ActivityIndicator, ScrollView, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../components/Text";
import Button from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { appealSelfie } from "../api/user";
import { routeWithSelfieStatus } from "../nav/routeWithSelfieStatus";

const { width, height } = Dimensions.get('window');

export default function AppealScreen({ navigation }) {
  const { theme } = useTheme();
  const [appealText, setAppealText] = useState("");
  const [loading, setLoading] = useState(false);

  const onAppeal = async () => {
    try {
      setLoading(true);
      await appealSelfie(appealText.trim());
      
      // Server sets appeal_requested = true; now route by status
      Alert.alert(
        "Appeal Submitted Successfully", 
        "Your appeal has been sent to our review team. They will review your request and get back to you soon.\n\nYou can now log back in and wait for the review process.",
        [
          {
            text: "Back to Login",
            onPress: () => navigation.replace("Login")
          }
        ]
      );
      
    } catch (error) {
      console.error("Appeal submission error:", error);
      
      const msg = error?.response?.data?.detail || error?.message || "Failed to submit appeal.";
      Alert.alert("Appeal Error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await routeWithSelfieStatus(navigation);
    } catch (error) {
      Alert.alert("Error", "Unable to check status. Please try again.");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.primary }]}>
      {/* Background decorations */}
      <View style={[
        styles.bgDecoration1, 
        { backgroundColor: theme.colors.accent + (theme.mode === 'dark' ? '06' : '08') }
      ]} />
      <View style={[
        styles.bgDecoration2, 
        { backgroundColor: theme.colors.redFlag + (theme.mode === 'dark' ? '04' : '06') }
      ]} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={[
              styles.iconContainer,
              { 
                backgroundColor: theme.colors.redFlag + '15',
                borderColor: theme.colors.redFlag + '30'
              }
            ]}>
              <Ionicons name="shield-outline" size={32} color={theme.colors.redFlag} />
            </View>
            
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Appeal Required
            </Text>
            
            <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
              Verification attempts exceeded
            </Text>
          </View>

          {/* Info Card */}
          <View style={[
            styles.infoCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }
          ]}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
              <Text style={[styles.infoTitle, { color: theme.colors.text }]}>
                What happened?
              </Text>
            </View>
            <Text style={[styles.infoText, { color: theme.colors.secondary }]}>
              You've reached the maximum number of selfie verification attempts. This security measure helps protect our community.
            </Text>
          </View>

          {/* Appeal Form */}
          <View style={styles.formSection}>
            <Text style={[styles.formLabel, { color: theme.colors.text }]}>
              Tell us why you should get another chance (optional)
            </Text>
            
            <View style={[
              styles.textAreaContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }
            ]}>
              <TextInput
                style={[
                  styles.textArea,
                  { 
                    color: theme.colors.text,
                    textAlignVertical: "top"
                  }
                ]}
                multiline
                numberOfLines={6}
                placeholder="Example: I had poor lighting, my camera was blurry, I was wearing glasses, etc."
                placeholderTextColor={theme.colors.secondary + '60'}
                value={appealText}
                onChangeText={setAppealText}
                maxLength={500}
              />
            </View>
            
            <Text style={[styles.charCount, { color: theme.colors.secondary }]}>
              {appealText.length}/500 characters
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              onPress={onAppeal}
              disabled={loading}
              style={[
                styles.appealButton,
                {
                  backgroundColor: theme.colors.accent,
                  shadowColor: theme.colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }
              ]}
            >
              {loading ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.buttonText, { color: '#fff', marginLeft: 12 }]}>
                    Submitting Appeal...
                  </Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={[styles.buttonText, { color: '#fff' }]}>
                    Submit Appeal
                  </Text>
                </View>
              )}
            </Button>

            <Button
              onPress={handleRefresh}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }
              ]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.colors.secondary }]}>
                I've been approved — Refresh
              </Text>
            </Button>
          </View>

          {/* Help Section */}
          <View style={[
            styles.helpCard,
            {
              backgroundColor: theme.colors.accent + '08',
              borderColor: theme.colors.accent + '20',
            }
          ]}>
            <View style={styles.helpHeader}>
              <Ionicons name="help-circle" size={18} color={theme.colors.accent} />
              <Text style={[styles.helpTitle, { color: theme.colors.accent }]}>
                Need Help?
              </Text>
            </View>
            <Text style={[styles.helpText, { color: theme.colors.secondary }]}>
              Appeals are typically reviewed within 24-48 hours. Make sure your reason is clear and honest to improve your chances of approval.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  
  // Background decorations
  bgDecoration1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -70,
    right: -60,
  },
  bgDecoration2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: 100,
    left: -40,
  },
  
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
  },

  // Info Card
  infoCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  infoTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  infoText: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.9,
  },

  // Form
  formSection: {
    marginBottom: 32,
  },

  formLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  textAreaContainer: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  textArea: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
  },

  charCount: {
    fontSize: 12,
    textAlign: 'right',
    opacity: 0.6,
    marginRight: 4,
  },

  // Buttons
  buttonContainer: {
    marginBottom: 24,
  },

  appealButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 12,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
  },

  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  // Help Card
  helpCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },

  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  helpTitle: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  helpText: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
});