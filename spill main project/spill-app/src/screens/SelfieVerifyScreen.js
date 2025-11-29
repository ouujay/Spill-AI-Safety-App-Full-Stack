import React, { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { 
  View, 
  Image, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Animated,
  ScrollView
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import Text from "../components/Text";
import Button from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { verifySelfie } from "../api/user";
import { routeWithSelfieStatus } from "../nav/routeWithSelfieStatus";

const MAX_TRIALS = 1; // Changed from 3 to 1
const { width, height } = Dimensions.get('window');

export default function SelfieVerifyScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false); // Track if user has made their one attempt

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cameraAnim = useRef(new Animated.Value(0)).current;

  const form = route.params?.form;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();

    // Pulse animation for camera
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  const pickImage = async () => {
    let permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Camera Permission Required", 
        "We need camera access to take your verification selfie.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Open Settings", 
            onPress: () => {
              // You might want to open device settings here
              Alert.alert("Please enable camera permission in device settings");
            }
          }
        ]
      );
      return;
    }

    // Animate camera action
    Animated.sequence([
      Animated.timing(cameraAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(cameraAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();

    try {
      let result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
        cameraType: ImagePicker.CameraType.front,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error launching camera:", error);
      Alert.alert("Camera Error", "Failed to open camera. Please try again.");
    }
  };

  const retakeSelfie = () => {
    // Only allow retake if user hasn't attempted verification yet
    if (!hasAttempted) {
      setImage(null);
      pickImage();
    } else {
      Alert.alert(
        "Verification Already Attempted", 
        "You've already used your one verification attempt. If you believe this is an error, you can submit an appeal.",
        [
          { 
            text: "Submit Appeal", 
            onPress: () => navigation.replace("AppealScreen", { form }) 
          },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const handleVerify = async () => {
    if (!image) {
      Alert.alert("Selfie Required", "Please take a clear selfie for verification.");
      return;
    }

    if (hasAttempted) {
      Alert.alert("Already Attempted", "You've already used your one verification attempt.");
      return;
    }
    
    try {
      setLoading(true);
      // FIXED: DON'T set hasAttempted here - wait for the API response!
      
      const result = await verifySelfie(image);
      
      console.log("Selfie verification result:", result);
      
      if (result.success || result.passed_threshold) {
        // Success - mark as attempted and route to next screen
        setHasAttempted(true);
        Alert.alert(
          "Verification Successful! ✅", 
          "Your selfie has been verified. Welcome to the community!",
          [
            {
              text: "Continue",
              onPress: async () => {
                // Wait a moment for the user to see success
                setTimeout(async () => {
                  await routeWithSelfieStatus(navigation);
                }, 500);
              }
            }
          ]
        );
      } else {
        // Verification failed - NOW mark as attempted
        setHasAttempted(true);
        Alert.alert(
          "Verification Failed ❌",
          `${result.message || "The selfie could not be verified."}\n\nYou only get one verification attempt. If you believe this is an error, you can submit an appeal.`,
          [
            { 
              text: "Submit Appeal", 
              onPress: () => navigation.replace("AppealScreen", { form }) 
            },
            {
              text: "Exit",
              onPress: () => navigation.replace("Login"),
              style: "cancel"
            }
          ]
        );
      }
    } catch (error) {
      console.error("Selfie verification error:", error);
      
      // Mark as attempted only after we get an error response
      setHasAttempted(true);
      
      let errorMessage = "Verification failed. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        "Verification Error", 
        errorMessage + "\n\nSince you only get one attempt, you can submit an appeal if this was due to a technical error.",
        [
          { 
            text: "Submit Appeal", 
            onPress: () => navigation.replace("AppealScreen", { form }) 
          },
          { text: "Exit", onPress: () => navigation.replace("Login"), style: "cancel" }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.primary }]}>
      {/* Enhanced background decorations */}
      <View style={[
        styles.bgDecoration1, 
        { backgroundColor: theme.colors.accent + (theme.mode === 'dark' ? '08' : '12') }
      ]} />
      <View style={[
        styles.bgDecoration2, 
        { backgroundColor: theme.colors.greenFlag + (theme.mode === 'dark' ? '06' : '08') }
      ]} />
      <View style={[
        styles.bgDecoration3, 
        { backgroundColor: theme.colors.accent + (theme.mode === 'dark' ? '04' : '06') }
      ]} />

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Enhanced Header */}
          <View style={styles.header}>
            {/* Security Badge */}
            <View style={[
              styles.securityBadgeTop,
              { 
                backgroundColor: theme.colors.greenFlag + '15',
                borderColor: theme.colors.greenFlag + '30'
              }
            ]}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.greenFlag} />
              <Text style={[styles.securityBadgeText, { color: theme.colors.greenFlag }]}>
                Secure Verification
              </Text>
            </View>

            {/* Enhanced Progress */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
                <Animated.View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: theme.colors.accent,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]} 
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={[styles.progressText, { color: theme.colors.accent }]}>
                  Step 2 of 2
                </Text>
                <Text style={[styles.progressText, { color: theme.colors.secondary }]}>
                  Final Step
                </Text>
              </View>
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              Selfie Verification
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
              ⚠️ One attempt only - Make it count!
            </Text>
            <Text style={[styles.description, { color: theme.colors.secondary }]}>
              This helps us maintain a safe community space. Your photo is processed securely and never shared. You only get one verification attempt.
            </Text>
          </View>

          {/* Warning Banner for Single Attempt */}
          <Animated.View 
            style={[
              styles.warningBanner,
              {
                backgroundColor: theme.colors.warning + '15',
                borderColor: theme.colors.warning + '30',
              }
            ]}
          >
            <Ionicons name="warning" size={20} color={theme.colors.warning} />
            <Text style={[styles.warningText, { color: theme.colors.warning }]}>
              {hasAttempted ? "Attempt used - Appeal available if needed" : "One attempt only - Ensure good lighting!"}
            </Text>
          </Animated.View>

          {/* Enhanced Camera Section */}
          <View style={styles.cameraSection}>
            <Animated.View
              style={[
                styles.cameraContainer,
                {
                  transform: [
                    { scale: image ? 1 : pulseAnim },
                    { rotateY: cameraAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '5deg']
                    })}
                  ]
                }
              ]}
            >
              <TouchableOpacity 
                onPress={image ? retakeSelfie : pickImage} 
                style={[
                  styles.cameraFrame, 
                  {
                    borderColor: image ? theme.colors.greenFlag : theme.colors.accent,
                    backgroundColor: image ? 'transparent' : theme.colors.surface,
                    shadowColor: image ? theme.colors.greenFlag : theme.colors.accent,
                    opacity: hasAttempted && !image ? 0.5 : 1,
                  }
                ]}
                activeOpacity={0.8}
                disabled={loading || (hasAttempted && !image)}
              >
                {image ? (
                  <>
                    <Image
                      source={{ uri: image }}
                      style={styles.selfieImage}
                    />
                    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
                      <View style={[styles.retakeButton, { backgroundColor: theme.colors.surface }]}>
                        <Ionicons name="camera" size={20} color={theme.colors.accent} />
                        <Text style={[styles.retakeText, { color: theme.colors.accent }]}>
                          {hasAttempted ? "Appeal" : "Retake"}
                        </Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.cameraPlaceholder}>
                    <View style={[styles.cameraIconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
                      <Ionicons name="camera-outline" size={56} color={theme.colors.accent} />
                    </View>
                    <Text style={[styles.placeholderTitle, { color: theme.colors.text }]}>
                      {hasAttempted ? "Attempt Used" : "Take Your Selfie"}
                    </Text>
                    <Text style={[styles.placeholderSubtitle, { color: theme.colors.secondary }]}>
                      {hasAttempted ? "Submit an appeal if needed" : "Tap to open camera"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Camera Guidelines - Only show if haven't attempted */}
              {!image && !hasAttempted && (
                <View style={styles.guidelines}>
                  <View style={styles.guidelineItem}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.greenFlag} />
                    <Text style={[styles.guidelineText, { color: theme.colors.secondary }]}>
                      Face clearly visible
                    </Text>
                  </View>
                  <View style={styles.guidelineItem}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.greenFlag} />
                    <Text style={[styles.guidelineText, { color: theme.colors.secondary }]}>
                      Good lighting
                    </Text>
                  </View>
                  <View style={styles.guidelineItem}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.greenFlag} />
                    <Text style={[styles.guidelineText, { color: theme.colors.secondary }]}>
                      Look directly at camera
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </View>

          {/* Enhanced Action Button */}
          <Animated.View 
            style={[
              styles.actionContainer,
              { opacity: fadeAnim }
            ]}
          >
            {!hasAttempted ? (
              <Button
                onPress={handleVerify}
                disabled={loading || !image}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: (image && !loading) ? theme.colors.accent : theme.colors.border,
                    shadowColor: theme.colors.accent,
                    shadowOpacity: (image && !loading) ? 0.3 : 0,
                    shadowOffset: { width: 0, height: 8 },
                    shadowRadius: 16,
                    elevation: (image && !loading) ? 8 : 2,
                  }
                ]}
              >
                {loading ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[styles.buttonText, { color: '#fff', marginLeft: 12 }]}>
                      Verifying...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons 
                      name="shield-checkmark" 
                      size={22} 
                      color="#fff" 
                      style={{ marginRight: 8 }} 
                    />
                    <Text style={[styles.buttonText, { color: '#fff' }]}>
                      Verify & Continue →
                    </Text>
                  </View>
                )}
              </Button>
            ) : (
              <Button
                onPress={() => navigation.replace("AppealScreen", { form })}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: theme.colors.warning,
                    shadowColor: theme.colors.warning,
                    shadowOpacity: 0.3,
                    shadowOffset: { width: 0, height: 8 },
                    shadowRadius: 16,
                    elevation: 8,
                  }
                ]}
              >
                <View style={styles.buttonContent}>
                  <Ionicons 
                    name="document-text" 
                    size={22} 
                    color="#fff" 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={[styles.buttonText, { color: '#fff' }]}>
                    Submit Appeal
                  </Text>
                </View>
              </Button>
            )}
          </Animated.View>

          {/* Enhanced Footer */}
          <Animated.View 
            style={[
              styles.footer,
              { opacity: fadeAnim }
            ]}
          >
            <View style={[
              styles.privacyCard,
              {
                backgroundColor: theme.colors.surface + (theme.mode === 'dark' ? '60' : '80'),
                borderColor: theme.colors.border,
              }
            ]}>
              <View style={styles.privacyHeader}>
                <Ionicons name="lock-closed" size={18} color={theme.colors.accent} />
                <Text style={[styles.privacyTitle, { color: theme.colors.text }]}>
                  Privacy Protected
                </Text>
              </View>
              <Text style={[styles.privacyText, { color: theme.colors.secondary }]}>
                Your selfie is processed securely using advanced AI technology. It's never stored permanently, shared publicly, or visible to other users. You have one verification attempt.
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bgDecoration1: { position: 'absolute', width: width * 0.7, height: width * 0.7, borderRadius: width * 0.35, top: -width * 0.3, left: -width * 0.2 },
  bgDecoration2: { position: 'absolute', width: 140, height: 140, borderRadius: 70, bottom: 100, right: -40 },
  bgDecoration3: { position: 'absolute', width: 80, height: 80, borderRadius: 40, top: height * 0.5, left: -20 },
  scrollContainer: { flexGrow: 1, paddingBottom: 30 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  header: { alignItems: 'center', marginBottom: 32 },
  securityBadgeTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginBottom: 24 },
  securityBadgeText: { marginLeft: 8, fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  progressContainer: { alignItems: 'center', marginBottom: 28 },
  progressBar: { width: width * 0.7, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', width: width * 0.7 },
  progressText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, textAlign: "center", marginBottom: 12, fontWeight: '600', opacity: 0.9 },
  description: { fontSize: 15, textAlign: "center", opacity: 0.8, lineHeight: 22, paddingHorizontal: 8 },
  warningBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 24, alignSelf: 'center', maxWidth: width * 0.9 },
  warningText: { marginLeft: 8, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'center' },
  cameraSection: { alignItems: 'center', marginBottom: 36 },
  cameraContainer: { alignItems: 'center' },
  cameraFrame: { width: 240, height: 240, borderRadius: 120, borderWidth: 4, alignItems: "center", justifyContent: "center", marginBottom: 20, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 12, position: 'relative', overflow: 'hidden' },
  selfieImage: { width: 232, height: 232, borderRadius: 116 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 116, alignItems: 'center', justifyContent: 'center' },
  retakeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  retakeText: { marginLeft: 6, fontSize: 14, fontWeight: '600' },
  cameraPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cameraIconContainer: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  placeholderTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4, letterSpacing: 0.3 },
  placeholderSubtitle: { fontSize: 14, opacity: 0.7, fontWeight: '500' },
  guidelines: { alignItems: 'flex-start' },
  guidelineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  guidelineText: { marginLeft: 8, fontSize: 14, opacity: 0.8 },
  actionContainer: { alignItems: 'center', marginBottom: 32 },
  submitButton: { width: width * 0.85, maxWidth: 360, paddingVertical: 20, borderRadius: 16 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  footer: { alignItems: 'center' },
  privacyCard: { width: '100%', maxWidth: 360, padding: 20, borderRadius: 16, borderWidth: 1 },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  privacyTitle: { marginLeft: 8, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  privacyText: { fontSize: 14, lineHeight: 20, opacity: 0.8, textAlign: 'left' }
});