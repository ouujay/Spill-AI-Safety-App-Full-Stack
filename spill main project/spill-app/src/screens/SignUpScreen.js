import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Dimensions, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Alert,
  Animated,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import Text from "../components/Text";
import Button from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { register } from "../api/auth";
import { routeWithSelfieStatus } from "../nav/routeWithSelfieStatus";
import { API_BASE_URL } from "../api/config"; // Use the centralized config

const { width, height } = Dimensions.get('window');

export default function SignUpScreen({ navigation }) {
  const { theme } = useTheme();
  const [form, setForm] = useState({
    email: "",
    dob: "",
    university: null, // important: null not ""
    password: "",
  });
  const [focusedField, setFocusedField] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // University fetching
  const [universities, setUniversities] = useState([]);
  const [loadingUnis, setLoadingUnis] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.5,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();

    // Fetch universities with improved error handling - FIXED API URL
    console.log('Fetching universities from:', `${API_BASE_URL}/api/users/universities/`);
    
    axios.get(`${API_BASE_URL}/api/users/universities/`)
      .then(res => {
        console.log('Raw university data:', res.data);
        
        // Handle both direct array and paginated response
        const list = res.data.results || res.data || [];
        
        // Normalize data to only keep {id, name}
        const normalizedUnis = list.map(u => ({ 
          id: u.id, 
          name: u.name || u.label || 'Unknown University' 
        }));
        console.log('Normalized universities:', normalizedUnis);
        setUniversities(normalizedUnis);
      })
      .catch((e) => {
        console.warn("Failed to load universities", e?.message || e);
        console.warn("API URL attempted:", `${API_BASE_URL}/api/users/universities/`);
        console.warn("Response:", e?.response?.data);
        console.warn("Status:", e?.response?.status);
        setUniversities([]);
      })
      .finally(() => setLoadingUnis(false));
  }, []);

  const updateForm = (key, value) => {
    console.log(`Updating form field ${key}:`, value, typeof value);
    setForm(prev => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  // Input fields configuration
  const inputFields = [
    { 
      key: 'email', 
      placeholder: 'Enter your email address', 
      label: 'Email Address',
      keyboardType: 'email-address', 
      autoCapitalize: 'none',
      icon: '📧'
    },
    { 
      key: 'password', 
      placeholder: 'Create a secure password', 
      label: 'Password',
      secureTextEntry: true,
      icon: '🔒'
    },
  ];

  // Validation: All required fields must be filled (university is optional)
  const isFormValid =
    !!form.email.trim() &&
    !!form.dob.trim() &&
    !!form.password.trim();

  const handleSubmit = async () => {
    if (!isFormValid) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // Debug: Log the form data being sent
      const registrationData = {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        date_of_birth: form.dob,     // already YYYY-MM-DD
        university: form.university ?? null, // null if not selected
      };
      
      console.log('Registration data being sent:', registrationData);
      
      // Register and store tokens
      const result = await register(registrationData);
      
      console.log('Registration successful, routing based on selfie status...');
      
      // Use smart routing after successful registration
      await routeWithSelfieStatus(navigation);
      
    } catch (err) {
      console.error('Registration error details:', err);
      console.error('Error response data:', err?.response?.data);
      
      // Enhanced error handling for different scenarios
      let errorMessage = "Registration failed. Please try again.";
      
      if (err?.response?.data) {
        const errorData = err.response.data;
        
        // Handle email-specific errors (duplicate email)
        if (errorData.email) {
          const emailError = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
          if (emailError.includes("already exists") || emailError.includes("duplicate")) {
            errorMessage = "This email is already registered. Try signing in instead.";
            
            // Show alert with option to go to login
            Alert.alert(
              "Email Already Registered",
              "An account with this email already exists. Would you like to sign in instead?",
              [
                { text: "Try Again", style: "cancel" },
                { 
                  text: "Sign In", 
                  onPress: () => navigation.replace("Login"),
                  style: "default"
                }
              ]
            );
            return; // Don't set error state if showing alert
          } else {
            errorMessage = `Email: ${emailError}`;
          }
        }
        // Handle password errors
        else if (errorData.password) {
          const passwordError = Array.isArray(errorData.password) ? errorData.password[0] : errorData.password;
          errorMessage = `Password: ${passwordError}`;
        }
        // Handle date of birth errors
        else if (errorData.date_of_birth) {
          const dobError = Array.isArray(errorData.date_of_birth) ? errorData.date_of_birth[0] : errorData.date_of_birth;
          errorMessage = `Date of birth: ${dobError}`;
        }
        // Handle university errors
        else if (errorData.university) {
          const uniError = Array.isArray(errorData.university) ? errorData.university[0] : errorData.university;
          errorMessage = `University: ${uniError}`;
        }
        // Handle general API errors
        else if (errorData.detail) {
          errorMessage = errorData.detail;
        }
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
        else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
        else {
          // Last resort: stringify the error object
          errorMessage = JSON.stringify(errorData);
        }
      } 
      // Handle network/connection errors
      else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        errorMessage = "Network error. Please check your connection and try again.";
      }
      // Handle timeout errors
      else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        errorMessage = "Request timed out. Please try again.";
      }
      // Handle other errors
      else if (err.message) {
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

  return (
    <>
      {/* StatusBar configuration - removed backgroundColor to fix warning */}
      <StatusBar 
        style={theme.mode === 'dark' ? 'light' : 'dark'} 
      />
      
      {/* CRITICAL: SafeAreaView with proper background to prevent white flash */}
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
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
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
                    opacity: fadeAnim,
                    transform: [{
                      scale: fadeAnim.interpolate({
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
                    source={require("../../assets/registers.png")}
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
                  <View style={[
                    styles.floatingElement3,
                    { backgroundColor: theme.colors.accent + '15' }
                  ]} />
                </View>
              </Animated.View>

              {/* Enhanced Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: theme.colors.text }]}>
                  Join the Community
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
                  Create your account to start spilling tea safely
                </Text>
              </View>

              {/* Enhanced Progress Indicator */}
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
                    Step 1 of 2
                  </Text>
                  <Text style={[styles.progressText, { color: theme.colors.secondary }]}>
                    50% Complete
                  </Text>
                </View>
              </View>

              {/* Enhanced Form */}
              <View style={styles.form}>
                {/* Email and Password */}
                {inputFields.map((field, index) => (
                  <Animated.View 
                    key={field.key} 
                    style={[
                      styles.inputContainer,
                      {
                        transform: [{
                          translateX: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0]
                          })
                        }]
                      }
                    ]}
                  >
                    <View style={styles.labelContainer}>
                      <Text style={styles.fieldIcon}>{field.icon}</Text>
                      <Text style={[styles.label, { color: theme.colors.text }]}>
                        {field.label} *
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
                        value={form[field.key]}
                        onChangeText={text => updateForm(field.key, text)}
                        onFocus={() => setFocusedField(field.key)}
                        onBlur={() => setFocusedField(null)}
                        keyboardType={field.keyboardType || 'default'}
                        autoCapitalize={field.autoCapitalize || 'sentences'}
                        secureTextEntry={field.secureTextEntry || false}
                      />
                      {form[field.key] && (
                        <Text style={styles.checkMark}>✓</Text>
                      )}
                    </View>
                  </Animated.View>
                ))}

                {/* Enhanced Date of Birth */}
                <Animated.View 
                  style={[
                    styles.inputContainer,
                    {
                      transform: [{
                        translateX: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0]
                        })
                      }]
                    }
                  ]}
                >
                  <View style={styles.labelContainer}>
                    <Text style={styles.fieldIcon}>📅</Text>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      Date of Birth *
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: focusedField === 'dob' ? theme.colors.accent : theme.colors.border,
                        borderWidth: focusedField === 'dob' ? 2 : 1,
                        shadowColor: theme.colors.accent,
                        shadowOpacity: focusedField === 'dob' ? 0.1 : 0,
                        shadowOffset: { width: 0, height: 4 },
                        shadowRadius: 8,
                        elevation: focusedField === 'dob' ? 4 : 2,
                      }
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.input,
                      { 
                        color: form.dob ? theme.colors.text : theme.colors.secondary + '60',
                        paddingVertical: 0
                      }
                    ]}>
                      {form.dob ? new Date(form.dob).toLocaleDateString() : "Select your date of birth"}
                    </Text>
                    {form.dob && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={form.dob ? new Date(form.dob) : new Date()}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(_, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) updateForm("dob", selectedDate.toISOString().split("T")[0]);
                      }}
                      maximumDate={new Date()}
                    />
                  )}
                </Animated.View>

                {/* FIXED University Picker with Dark Mode Support */}
                <Animated.View 
                  style={[
                    styles.inputContainer,
                    {
                      transform: [{
                        translateX: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, 0]
                        })
                      }]
                    }
                  ]}
                >
                  <View style={styles.labelContainer}>
                    <Text style={styles.fieldIcon}>🎓</Text>
                    <Text style={[styles.label, { color: theme.colors.text }]}>
                      University (Optional)
                    </Text>
                  </View>
                  <View style={[
                    styles.inputWrapper,
                    styles.pickerWrapper,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: focusedField === 'university' ? theme.colors.accent : theme.colors.border,
                      borderWidth: focusedField === 'university' ? 2 : 1,
                      shadowColor: theme.colors.accent,
                      shadowOpacity: focusedField === 'university' ? 0.1 : 0,
                      shadowOffset: { width: 0, height: 4 },
                      shadowRadius: 8,
                      elevation: focusedField === 'university' ? 4 : 2,
                    }
                  ]}>
                    {loadingUnis ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator color={theme.colors.accent} size="small" />
                        <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
                          Loading universities...
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Picker
                          selectedValue={form.university}
                          onValueChange={(val) => {
                            console.log('Raw picker value:', val, typeof val);
                            const processedVal = val === null || val === 'null' ? null : Number(val);
                            console.log('Processed picker value:', processedVal, typeof processedVal);
                            updateForm('university', processedVal);
                          }}
                          style={[
                            styles.picker,
                            { 
                              color: form.university ? theme.colors.text : theme.colors.secondary,
                              // CRITICAL: Set background color for dark mode visibility
                              backgroundColor: Platform.OS === 'android' ? theme.colors.surface : 'transparent'
                            }
                          ]}
                          dropdownIconColor={theme.colors.accent}
                          onFocus={() => setFocusedField('university')}
                          onBlur={() => setFocusedField(null)}
                          // Add itemStyle for iOS dark mode support
                          itemStyle={{
                            color: theme.colors.text,
                            backgroundColor: theme.colors.surface,
                            fontSize: 16
                          }}
                          // Add mode for Android
                          mode="dropdown"
                        >
                          <Picker.Item 
                            label="Select your university (optional)" 
                            value={null} 
                            color={theme.colors.secondary} 
                            style={{
                              backgroundColor: theme.colors.surface,
                              color: theme.colors.secondary
                            }}
                          />
                          {universities.map((u) => (
                            <Picker.Item
                              key={u.id}
                              label={u.name}
                              value={u.id}
                              color={theme.colors.text}
                              style={{
                                backgroundColor: theme.colors.surface,
                                color: theme.colors.text
                              }}
                            />
                          ))}
                        </Picker>
                        {form.university && (
                          <Text style={[styles.checkMark, styles.pickerCheckMark]}>✓</Text>
                        )}
                      </>
                    )}
                  </View>
                  
                  {/* Fallback message for empty university list */}
                  {!loadingUnis && universities.length === 0 && (
                    <Text style={[styles.fallbackText, { color: theme.colors.secondary }]}>
                      Universities will be loaded when available. You can skip this step.
                    </Text>
                  )}
                </Animated.View>

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
              </View>

              {/* Enhanced Terms Section */}
              <Animated.View 
                style={[
                  styles.termsContainer,
                  {
                    opacity: fadeAnim,
                    backgroundColor: theme.colors.surface + (theme.mode === 'dark' ? '40' : '60'),
                    borderColor: theme.colors.border,
                  }
                ]}
              >
                <Text style={[styles.termsIcon]}>📝</Text>
                <Text style={[styles.termsText, { color: theme.colors.secondary }]}>
                  By continuing, you agree to our{' '}
                  <Text style={[styles.termsLink, { color: theme.colors.accent }]}>
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text style={[styles.termsLink, { color: theme.colors.accent }]}>
                    Privacy Policy
                  </Text>
                </Text>
              </Animated.View>

              {/* Enhanced Buttons */}
              <Animated.View 
                style={[
                  styles.buttonContainer,
                  { opacity: fadeAnim }
                ]}
              >
                <Button
                  onPress={handleSubmit}
                  disabled={!isFormValid || loading}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: isFormValid && !loading ? theme.colors.accent : theme.colors.border,
                      shadowColor: theme.colors.accent,
                      shadowOpacity: isFormValid && !loading ? 0.3 : 0,
                      shadowOffset: { width: 0, height: 4 },
                      shadowRadius: 12,
                      elevation: isFormValid && !loading ? 6 : 2,
                    }
                  ]}
                >
                  {loading ? (
                    <View style={styles.loadingButton}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={[styles.buttonText, { color: '#fff', marginLeft: 12 }]}>
                        Creating Account...
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.buttonText, { color: '#fff' }]}>
                      Continue to Verification →
                    </Text>
                  )}
                </Button>

                <TouchableOpacity 
                  onPress={() => navigation.replace("Login")}
                  style={styles.loginLink}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.loginLinkText, { color: theme.colors.accent }]}>
                    Already have an account? Sign in
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  bgDecoration1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -80, right: -60 },
  bgDecoration2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, bottom: 120, left: -50 },
  bgDecoration3: { position: 'absolute', width: 100, height: 100, borderRadius: 50, top: height * 0.4, right: -20 },
  scrollContainer: { flexGrow: 1, paddingBottom: 30 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  illustrationContainer: { marginBottom: 24, alignItems: 'center' },
  illustrationWrapper: { width: width * 0.8, height: width * 0.7, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, position: 'relative', overflow: 'hidden', shadowColor: '#8b16ff', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  illustration: { width: '85%', height: '85%', zIndex: 2 },
  floatingElement1: { position: 'absolute', width: 32, height: 32, borderRadius: 16, top: 16, right: 16, zIndex: 1 },
  floatingElement2: { position: 'absolute', width: 24, height: 24, borderRadius: 12, bottom: 20, left: 20, zIndex: 1 },
  floatingElement3: { position: 'absolute', width: 20, height: 20, borderRadius: 10, top: '50%', left: 16, zIndex: 1 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", textAlign: "center", letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 17, textAlign: "center", opacity: 0.8, letterSpacing: 0.2, lineHeight: 24 },
  progressContainer: { alignItems: 'center', marginBottom: 28 },
  progressBar: { width: width * 0.7, height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', width: width * 0.7 },
  progressText: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  form: { marginBottom: 24 },
  inputContainer: { marginBottom: 24 },
  labelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginLeft: 4 },
  fieldIcon: { fontSize: 16, marginRight: 8 },
  label: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  inputWrapper: { borderRadius: 16, flexDirection: 'row', alignItems: 'center', position: 'relative' },
  input: { flex: 1, paddingVertical: 18, paddingHorizontal: 20, fontSize: 16, letterSpacing: 0.2 },
  checkMark: { fontSize: 18, color: '#26d08c', marginRight: 16, fontWeight: 'bold' },
  pickerWrapper: { paddingVertical: 0, paddingHorizontal: 0 },
  picker: { flex: 1, height: 54 },
  pickerCheckMark: { position: 'absolute', right: 16, top: '50%', marginTop: -9 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  loadingText: { marginLeft: 12, fontSize: 16 },
  fallbackText: { marginTop: 8, fontSize: 12, opacity: 0.7, textAlign: 'center', fontStyle: 'italic' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  errorIcon: { fontSize: 16, marginRight: 10 },
  errorText: { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 18 },
  termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 16, borderWidth: 1 },
  termsIcon: { fontSize: 16, marginRight: 12 },
  termsText: { flex: 1, fontSize: 14, lineHeight: 20, opacity: 0.9 },
  termsLink: { fontWeight: '600', textDecorationLine: 'underline' },
  buttonContainer: { alignItems: 'center', marginTop: 8 },
  primaryButton: { width: '100%', maxWidth: 400, borderRadius: 16, paddingVertical: 20, marginBottom: 16 },
  buttonText: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  loadingButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  loginLink: { paddingVertical: 16, paddingHorizontal: 20 },
  loginLinkText: { fontSize: 16, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 }
});