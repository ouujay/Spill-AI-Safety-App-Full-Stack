import React, { useState, useRef, useEffect } from "react";
import { 
  Platform, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  StyleSheet, 
  Dimensions, 
  ActivityIndicator,
  Animated,
  Image,
  ScrollView
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from '@expo/vector-icons'; // For eye icon
import Text from "../components/Text";
import Button from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { login } from "../api/auth";
import { routeWithSelfieStatus } from "../nav/routeWithSelfieStatus";

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // NEW: Password visibility toggle
  const [focusedField, setFocusedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const illustrationAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(illustrationAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      console.log('Attempting login for:', email.trim().toLowerCase());
      
      // Login and store tokens (tokens are stored by the login function)
      await login({ email: email.trim().toLowerCase(), password });
      
      console.log('Login successful, routing based on selfie status...');
      
      // Use smart routing after successful login
      await routeWithSelfieStatus(navigation);
      
    } catch (err) {
      console.error("Login error:", err);
      
      // Enhanced error handling
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (err?.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors) 
            ? errorData.non_field_errors[0] 
            : errorData.non_field_errors;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = "Request timed out. Please try again.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Shake animation for error
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start();
    } finally {
      setLoading(false);
    }
  };

  const inputFields = [
    {
      key: 'email',
      placeholder: 'Enter your email address',
      value: email,
      onChangeText: (text) => {
        setEmail(text);
        if (error) setError(""); // Clear error when user starts typing
      },
      keyboardType: 'email-address',
      autoCapitalize: 'none',
      icon: '📧'
    },
    {
      key: 'password',
      placeholder: 'Enter your password',
      value: password,
      onChangeText: (text) => {
        setPassword(text);
        if (error) setError(""); // Clear error when user starts typing
      },
      secureTextEntry: !showPassword, // UPDATED: Use showPassword state
      icon: '🔒',
      hasToggle: true // NEW: Flag to show password toggle
    }
  ];

  const isFormValid = email.trim() && password.trim();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.primary }]}>
      {/* Enhanced background decorations */}
      <View style={[
        styles.bgDecoration1, 
        { backgroundColor: theme.colors.accent + (theme.mode === 'dark' ? '08' : '10') }
      ]} />
      <View style={[
        styles.bgDecoration2, 
        { backgroundColor: theme.colors.greenFlag + (theme.mode === 'dark' ? '06' : '08') }
      ]} />
      <View style={[
        styles.bgDecoration3, 
        { backgroundColor: theme.colors.accent + (theme.mode === 'dark' ? '04' : '06') }
      ]} />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={24}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            {/* Illustration Section */}
            <Animated.View 
              style={[
                styles.illustrationContainer,
                {
                  opacity: illustrationAnim,
                  transform: [{
                    scale: illustrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1]
                    })
                  }]
                }
              ]}
            >
              <View style={[
                styles.illustrationWrapper,
                { 
                  backgroundColor: theme.colors.accent + (theme.mode === 'dark' ? '10' : '15'),
                  borderColor: theme.colors.accent + '20'
                }
              ]}>
                <Image
                  source={require("../../assets/login.png")}
                  style={styles.illustration}
                  resizeMode="contain"
                />
                {/* Floating decorative elements */}
                <View style={[
                  styles.floatingElement1,
                  { backgroundColor: theme.colors.accent + '20' }
                ]} />
                <View style={[
                  styles.floatingElement2,
                  { backgroundColor: theme.colors.greenFlag + '20' }
                ]} />
              </View>
            </Animated.View>

            {/* Header */}
            <Animated.View 
              style={[
                styles.header,
                {
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0]
                    })
                  }]
                }
              ]}
            >
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
                Sign in to continue spilling tea ☕
              </Text>
            </Animated.View>

            {/* Enhanced Form */}
            <Animated.View 
              style={[
                styles.form,
                {
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0]
                    })
                  }]
                }
              ]}
            >
              {inputFields.map((field, index) => (
                <View key={field.key} style={styles.inputContainer}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.fieldIcon}>{field.icon}</Text>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      {field.key === 'email' ? 'Email Address' : 'Password'}
                    </Text>
                  </View>
                  <View style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: focusedField === field.key ? theme.colors.accent : theme.colors.border,
                      borderWidth: focusedField === field.key ? 2 : 1,
                      shadowColor: theme.colors.accent,
                      shadowOpacity: focusedField === field.key ? 0.1 : 0,
                      shadowOffset: { width: 0, height: 4 },
                      shadowRadius: 8,
                      elevation: focusedField === field.key ? 4 : 2,
                    }
                  ]}>
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder={field.placeholder}
                      placeholderTextColor={theme.colors.secondary + '60'}
                      value={field.value}
                      onChangeText={field.onChangeText}
                      keyboardType={field.keyboardType || 'default'}
                      autoCapitalize={field.autoCapitalize || 'sentences'}
                      secureTextEntry={field.secureTextEntry || false}
                      onFocus={() => setFocusedField(field.key)}
                      onBlur={() => setFocusedField(null)}
                    />
                    
                    {/* RIGHT SIDE ICONS */}
                    <View style={styles.rightIconsContainer}>
                      {/* Checkmark for filled fields */}
                      {field.value && !field.hasToggle && (
                        <Text style={styles.checkMark}>✓</Text>
                      )}
                      
                      {/* Password visibility toggle */}
                      {field.hasToggle && (
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.passwordToggle}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={22}
                            color={theme.colors.secondary}
                          />
                        </TouchableOpacity>
                      )}
                      
                      {/* Checkmark for password field (after toggle) */}
                      {field.hasToggle && field.value && (
                        <Text style={[styles.checkMark, { marginLeft: 8 }]}>✓</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}

              {/* Enhanced Error Message */}
              {error ? (
                <Animated.View 
                  style={[
                    styles.errorContainer,
                    { 
                      backgroundColor: theme.colors.redFlag + '15',
                      borderColor: theme.colors.redFlag + '30'
                    }
                  ]}
                >
                  <Text style={styles.errorIcon}>⚠️</Text>
                  <Text style={[styles.errorText, { color: theme.colors.redFlag }]}>
                    {error}
                  </Text>
                </Animated.View>
              ) : null}

              {/* Enhanced Login Button */}
              <Button
                onPress={handleLogin}
                disabled={!isFormValid || loading}
                style={[
                  styles.loginButton,
                  {
                    backgroundColor: isFormValid && !loading ? theme.colors.accent : theme.colors.border,
                    shadowColor: theme.colors.accent,
                    shadowOpacity: isFormValid && !loading ? 0.3 : 0,
                    shadowOffset: { width: 0, height: 6 },
                    shadowRadius: 12,
                    elevation: isFormValid && !loading ? 8 : 2,
                  }
                ]}
              >
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[styles.buttonText, { color: '#fff', marginLeft: 12 }]}>
                      Signing In...
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, { color: '#fff' }]}>
                    Sign In →
                  </Text>
                )}
              </Button>
            </Animated.View>

            {/* Enhanced Footer */}
            <Animated.View 
              style={[
                styles.footer,
                {
                  opacity: fadeAnim,
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }]
                }
              ]}
            >
              <TouchableOpacity 
                onPress={() => navigation.navigate("ForgotPassword")}
                style={styles.linkButton}
                activeOpacity={0.7}
              >
                <Text style={[styles.linkText, { color: theme.colors.accent }]}>
                  Forgot your password?
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.dividerText, { color: theme.colors.secondary }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              </View>

              <TouchableOpacity 
                onPress={() => navigation.replace("SignUp")}
                style={[
                  styles.secondaryButton, 
                  { 
                    borderColor: theme.colors.accent + '40',
                    backgroundColor: theme.colors.accent + '05'
                  }
                ]}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.colors.accent }]}>
                  Create new account
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bgDecoration1: { position: 'absolute', width: width * 0.9, height: width * 0.9, borderRadius: width * 0.45, top: -width * 0.5, right: -width * 0.4 },
  bgDecoration2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, bottom: 120, left: -50 },
  bgDecoration3: { position: 'absolute', width: 100, height: 100, borderRadius: 50, top: height * 0.6, right: -20 },
  scrollContainer: { flexGrow: 1, paddingBottom: 30 },
  container: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 40 },
  illustrationContainer: { marginBottom: 32, alignItems: 'center' },
  illustrationWrapper: { width: width * 0.75, height: width * 0.65, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative', overflow: 'hidden', shadowColor: '#8b16ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  illustration: { width: '80%', height: '80%', zIndex: 2 },
  floatingElement1: { position: 'absolute', width: 40, height: 40, borderRadius: 20, top: 20, right: 20, zIndex: 1 },
  floatingElement2: { position: 'absolute', width: 28, height: 28, borderRadius: 14, bottom: 24, left: 24, zIndex: 1 },
  header: { alignItems: 'center', marginBottom: 36 },
  title: { fontSize: 32, fontWeight: "800", textAlign: "center", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 17, textAlign: "center", opacity: 0.8, letterSpacing: 0.2, lineHeight: 24 },
  form: { width: '100%', maxWidth: 400, marginBottom: 32 },
  inputContainer: { marginBottom: 24 },
  labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 4 },
  fieldIcon: { fontSize: 16, marginRight: 8 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  inputWrapper: { borderRadius: 16, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  input: { flex: 1, paddingVertical: 18, paddingHorizontal: 20, fontSize: 16, letterSpacing: 0.2 },
  
  // NEW: Container for right-side icons
  rightIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  
  // NEW: Password toggle button
  passwordToggle: {
    padding: 4,
  },
  
  checkMark: { fontSize: 18, color: '#26d08c', fontWeight: 'bold' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  errorIcon: { fontSize: 16, marginRight: 10 },
  errorText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 18 },
  loginButton: { width: "100%", borderRadius: 16, paddingVertical: 20, marginTop: 8 },
  buttonText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footer: { width: '100%', maxWidth: 400, alignItems: 'center' },
  linkButton: { paddingVertical: 16, paddingHorizontal: 20 },
  linkText: { fontSize: 16, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, width: '100%' },
  dividerLine: { flex: 1, height: 1, opacity: 0.3 },
  dividerText: { marginHorizontal: 16, fontSize: 14, opacity: 0.6, fontWeight: '500' },
  secondaryButton: { width: '100%', borderRadius: 16, borderWidth: 1.5, paddingVertical: 18, alignItems: 'center' },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3 }
});