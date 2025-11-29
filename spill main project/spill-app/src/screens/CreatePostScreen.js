// CreatePostScreen.js - Enhanced with hashtag autocomplete
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../theme/ThemeProvider";
import { createPost } from "../api/api";
import { uploadToCloudinary, getCloudinarySignature } from "../api/cloudinary";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE_URL } from "../api/config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

// Helper function for auth headers
const authHeaders = async () => {
  const token = await AsyncStorage.getItem("accessToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// Hashtag search function
const searchHashtags = async (query) => {
  if (!query || query.length < 1) return [];
  
  try {
    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/search/hashtags/?q=${encodeURIComponent(query)}&limit=8`,
      { headers }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching hashtags:', error);
    return [];
  }
};

// Get trending hashtags
const getTrendingHashtags = async () => {
  try {
    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/search/hashtags/?trending=true&limit=6`,
      { headers }
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error getting trending hashtags:', error);
    return [];
  }
};

export default function CreatePostScreen({ navigation, route }) {
  const { theme } = useTheme();
  
  // Form state
  const [firstName, setFirstName] = useState("");
  const [personAge, setPersonAge] = useState("");
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  
  // Hashtag autocomplete state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentHashtag, setCurrentHashtag] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isTypingHashtag, setIsTypingHashtag] = useState(false);
  
  // Loading states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  
  // UI state
  const [charCount, setCharCount] = useState(0);
  const [universities, setUniversities] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  
  const contentRef = useRef(null);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    
    loadUniversities();
  }, []);

  useEffect(() => {
    if (selectedFlag === undefined) {
      setSelectedFlag(null);
    }
  }, []);

  // Hashtag detection effect
  useEffect(() => {
    const text = content || '';
    const beforeCursor = text.substring(0, cursorPosition);
    
    // Find the last # symbol before cursor
    const lastHashIndex = beforeCursor.lastIndexOf('#');
    
    if (lastHashIndex !== -1) {
      // Check if there's a space or newline after the # and before cursor
      const afterHash = beforeCursor.substring(lastHashIndex + 1);
      const hasSpaceOrNewline = /[\s\n]/.test(afterHash);
      
      if (!hasSpaceOrNewline) {
        // User is typing a hashtag
        setIsTypingHashtag(true);
        setCurrentHashtag(afterHash);
        setShowSuggestions(true);
        
        // Search for suggestions
        if (afterHash.length > 0) {
          searchForSuggestions(afterHash);
        } else {
          // Show trending hashtags when just typing #
          loadTrendingHashtags();
        }
      } else {
        setIsTypingHashtag(false);
        setShowSuggestions(false);
      }
    } else {
      setIsTypingHashtag(false);
      setShowSuggestions(false);
    }
  }, [content, cursorPosition]);

  // Search for hashtag suggestions
  const searchForSuggestions = async (query) => {
    try {
      const results = await searchHashtags(query);
      const sortedResults = results.sort((a, b) => (b.post_count || 0) - (a.post_count || 0));
      setSuggestions(sortedResults);
    } catch (error) {
      console.error('Error searching hashtags:', error);
      setSuggestions([]);
    }
  };

  // Load trending hashtags
  const loadTrendingHashtags = async () => {
    try {
      const trending = await getTrendingHashtags();
      setSuggestions(trending);
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      setSuggestions([]);
    }
  };

  // Handle hashtag selection
  const selectHashtag = (hashtag) => {
    const text = content || '';
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // Find the position of the current hashtag being typed
    const lastHashIndex = beforeCursor.lastIndexOf('#');
    
    if (lastHashIndex !== -1) {
      const beforeHash = text.substring(0, lastHashIndex);
      const newText = beforeHash + `#${hashtag.name} ` + afterCursor;
      
      setContent(newText);
      setCharCount(newText.length);
      
      // Move cursor to after the inserted hashtag
      const newCursorPosition = lastHashIndex + hashtag.name.length + 2; // +2 for # and space
      setTimeout(() => {
        setCursorPosition(newCursorPosition);
        if (contentRef.current) {
          contentRef.current.setNativeProps({
            selection: { start: newCursorPosition, end: newCursorPosition }
          });
        }
      }, 10);
    }
    
    setShowSuggestions(false);
    setIsTypingHashtag(false);
  };

  // Function to clear the form after successful posting
  const clearForm = () => {
    setFirstName("");
    setPersonAge("");
    setSelectedFlag(null);
    setContent("");
    setImage(null);
    setSelectedUniversity(null);
    setCharCount(0);
    setValidationErrors([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setCurrentHashtag('');
    setCursorPosition(0);
    setIsTypingHashtag(false);
  };

  // Load universities from API
  const loadUniversities = async () => {
    try {
      setLoadingUniversities(true);
      const response = await fetch(`${API_BASE_URL}/api/users/universities/`, {
        headers: await authHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        const universityList = data.results || data;
        setUniversities(universityList);
        
        // Set user's university as default if available
        const userUniversityId = route.params?.userUniversityId;
        if (userUniversityId) {
          const userUniversity = universityList.find(uni => uni.id === userUniversityId);
          if (userUniversity) {
            setSelectedUniversity(userUniversity);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load universities:', error);
      Alert.alert("Error", "Failed to load universities. Please try again.");
    } finally {
      setLoadingUniversities(false);
    }
  };

  const flagOptions = [
    { 
      id: null, 
      label: "Tea", 
      emoji: "🫖", 
      desc: "General thoughts & experiences",
      color: "#8B5CF6",
    },
    { 
      id: "red", 
      label: "Red Flag", 
      emoji: "🚩", 
      desc: "Warning about concerning behavior",
      color: "#EF4444",
    },
    { 
      id: "green", 
      label: "Green Flag", 
      emoji: "💚", 
      desc: "Positive traits worth celebrating",
      color: "#22C55E",
    },
  ];

  const handleContentChange = (text) => {
    setContent(text);
    setCharCount(text.length);
    updateValidationErrors();
  };

  // Handle selection change (cursor movement)
  const handleSelectionChange = (event) => {
    setCursorPosition(event.nativeEvent.selection.start);
  };

  // Real-time validation feedback
  const updateValidationErrors = () => {
    const errors = [];
    
    if (!image) {
      errors.push("📸 Add a photo");
    }
    
    if (!firstName.trim()) {
      errors.push("👤 Enter person's first name");
    } else if (firstName.trim().length < 2) {
      errors.push("👤 First name needs at least 2 characters");
    }
    
    if (!selectedUniversity) {
      errors.push("🏫 Select a university");
    }
    
    if (personAge && (isNaN(personAge) || parseInt(personAge) < 16 || parseInt(personAge) > 60)) {
      errors.push("🔢 Age must be between 16-60");
    }
    
    if (content.trim().length < 20) {
      errors.push(`💭 Write at least ${20 - content.trim().length} more characters`);
    }
    
    if (content.trim().length > 280) {
      errors.push("💭 Content too long (max 280 characters)");
    }
    
    setValidationErrors(errors);
  };

  // Run validation when dependencies change
  useEffect(() => {
    updateValidationErrors();
  }, [image, firstName, selectedUniversity, personAge, content]);

  // Form ready check
  const isFormReady = () => {
    let ageValid = true;
    if (personAge && personAge.trim() !== "") {
      const age = parseInt(personAge);
      ageValid = !isNaN(age) && age >= 16 && age <= 60;
    }

    return (
      image !== null &&
      firstName.trim().length >= 2 &&
      content.trim().length >= 20 &&
      content.trim().length <= 280 &&
      selectedUniversity !== null &&
      ageValid &&
      !uploadingImage &&
      !isPosting
    );
  };

  const validateFormForPost = () => {
    if (validationErrors.length > 0) {
      Alert.alert("Please fix these issues:", validationErrors.join("\n"));
      return false;
    }
    return true;
  };

  // Image handling functions
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "You need to allow photo access to upload images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsMultipleSelection: false,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = {
          uri: result.assets[0].uri,
          id: Date.now(),
        };
        setImage(selectedImage);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "You need to allow camera access to take photos.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'Images',
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newImage = {
          uri: result.assets[0].uri,
          id: Date.now(),
        };
        setImage(newImage);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const removeImage = () => {
    setImage(null);
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      "Add Photo",
      "Choose how you'd like to add a photo",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Camera", onPress: takePhoto },
        { text: "Photo Library", onPress: pickImage },
      ]
    );
  };

  // Post submission
  const handlePost = async () => {
    if (!validateFormForPost()) return;

    try {
      setIsPosting(true);

      let uploadedImageUrl = null;
      if (image) {
        setUploadingImage(true);
        
        try {
          console.log("Getting Cloudinary signature...");
          const signatureData = await getCloudinarySignature();
          
          console.log("Starting Cloudinary upload...");
          const uploadResult = await uploadToCloudinary({
            fileUri: image.uri,
            resourceType: "image",
            signatureData: signatureData,
            onProgress: (progress) => {
              console.log(`Upload progress: ${progress}%`);
            }
          });
          
          uploadedImageUrl = uploadResult.secure_url;
          
        } catch (uploadError) {
          console.error("Cloudinary upload failed:", uploadError);
          Alert.alert(
            "Upload Error", 
            `Failed to upload image: ${uploadError.message || 'Unknown error'}`
          );
          return;
        } finally {
          setUploadingImage(false);
        }
      }
      
      const postData = {
        first_name: firstName.trim(),
        person_age: personAge ? parseInt(personAge) : null,
        flag: selectedFlag,
        content: content.trim(),
        university: selectedUniversity?.id,
      };

      if (uploadedImageUrl) {
        postData.asset = {
          secure_url: uploadedImageUrl,
          url: uploadedImageUrl,
          resource_type: "image"
        };
      }

      console.log('Creating post with data:', JSON.stringify(postData, null, 2));
      
      const result = await createPost(postData);
      console.log('Post created successfully:', result);
      
      // Clear the form after successful posting
      clearForm();
      
      Alert.alert(
        "Posted! ✅",
        "Your post has been shared with the community.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
      
    } catch (error) {
      console.error("Post creation error:", error);
      let errorMessage = "Failed to create post. Please try again.";
      
      if (error?.response?.data?.error || error?.response?.data?.detail) {
        errorMessage = error.response.data.error || error.response.data.detail;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setIsPosting(false);
      setUploadingImage(false);
    }
  };

  const getSelectedFlag = () => {
    return flagOptions.find(opt => opt.id === selectedFlag) || flagOptions[0];
  };

  const getProgressWidth = () => {
    const steps = [
      true, // Flag always selected
      image !== null,
      firstName.trim().length >= 2,
      selectedUniversity !== null,
      content.trim().length >= 20
    ];
    const completedSteps = steps.filter(Boolean).length;
    return (completedSteps / steps.length) * 100;
  };

  // Render hashtag suggestion item
  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => selectHashtag(item)}
    >
      <View style={[styles.suggestionIcon, { backgroundColor: theme.colors.accent + '20' }]}>
        <Ionicons name="pricetag" size={16} color={theme.colors.accent} />
      </View>
      <View style={styles.suggestionContent}>
        <Text style={[styles.suggestionName, { color: theme.colors.text }]}>
          #{item.name}
        </Text>
        {item.post_count && (
          <Text style={[styles.suggestionCount, { color: theme.colors.secondary }]}>
            {item.post_count.toLocaleString()} posts
          </Text>
        )}
      </View>
      <Ionicons name="arrow-up-outline" size={16} color={theme.colors.secondary} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.accent + '15', theme.colors.background]}
        style={[styles.header, { borderBottomColor: theme.colors.border }]}
      >
        <TouchableOpacity 
          style={[styles.headerButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Share Your Experience
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.secondary }]}>
            Help others in the community
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.postButton, 
            { 
              backgroundColor: isFormReady() 
                ? theme.colors.accent 
                : theme.colors.border + '60',
            }
          ]}
          onPress={handlePost}
          disabled={!isFormReady()}
        >
          {isPosting || uploadingImage ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.postButtonText, { color: '#FFFFFF' }]}>Post</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
          <Animated.View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: theme.colors.accent,
                width: `${getProgressWidth()}%`
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: theme.colors.secondary }]}>
          {Math.round(getProgressWidth())}% complete
        </Text>
      </View>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <View style={[styles.validationContainer, { backgroundColor: theme.colors.warning + '10' }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.validationList}>
              {validationErrors.map((error, index) => (
                <View key={index} style={[styles.validationItem, { backgroundColor: theme.colors.warning + '20' }]}>
                  <Text style={[styles.validationText, { color: theme.colors.warning }]}>
                    {error}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContainer}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Image Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              📸 Add Photo
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.secondary }]}>
              Upload 1 photo of this person (required)
            </Text>
            
            <View style={styles.imageContainer}>
              {image ? (
                <View style={styles.selectedImageContainer}>
                  <Image source={{ uri: image.uri }} style={styles.selectedImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={removeImage}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={showImagePickerOptions}
                  >
                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.addImageButton,
                    {
                      backgroundColor: theme.colors.accent + '15',
                      borderColor: theme.colors.accent,
                      borderWidth: 2,
                      borderStyle: 'solid',
                    }
                  ]}
                  onPress={showImagePickerOptions}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.addImageIcon,
                    { backgroundColor: theme.colors.accent + '20' }
                  ]}>
                    <Ionicons 
                      name="camera" 
                      size={32} 
                      color={theme.colors.accent} 
                    />
                  </View>
                  <Text style={[
                    styles.addImageText,
                    { color: theme.colors.accent }
                  ]}>
                    Add Photo
                  </Text>
                  <Text style={[styles.requiredText, { color: theme.colors.accent }]}>
                    Required
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Post Type Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              🏷️ What kind of story?
            </Text>
            
            <View style={styles.flagOptions}>
              {flagOptions.map((option) => {
                const isSelected = selectedFlag === option.id;
                return (
                  <TouchableOpacity
                    key={option.id !== null ? option.id : 'tea'}
                    style={[
                      styles.flagOption,
                      {
                        backgroundColor: isSelected 
                          ? option.color + '15'
                          : theme.colors.surface,
                        borderColor: isSelected 
                          ? option.color 
                          : theme.colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      }
                    ]}
                    onPress={() => setSelectedFlag(option.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.flagHeader}>
                      <View style={[styles.flagEmojiContainer, { backgroundColor: option.color + '20' }]}>
                        <Text style={styles.flagEmoji}>{option.emoji}</Text>
                      </View>
                      <View style={styles.flagContent}>
                        <Text style={[
                          styles.flagLabel, 
                          { color: isSelected ? option.color : theme.colors.text }
                        ]}>
                          {option.label}
                        </Text>
                        <Text style={[styles.flagDesc, { color: theme.colors.secondary }]}>
                          {option.desc}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* University Selection */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              🏫 Which university?
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.secondary }]}>
              Choose the university this person is associated with
            </Text>
            
            {loadingUniversities ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
                  Loading universities...
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.universityScroll}>
                <View style={styles.universityOptions}>
                  {universities.map((university) => (
                    <TouchableOpacity
                      key={university.id}
                      style={[
                        styles.universityOption,
                        {
                          backgroundColor: selectedUniversity?.id === university.id 
                            ? theme.colors.accent + '15'
                            : theme.colors.surface,
                          borderColor: selectedUniversity?.id === university.id 
                            ? theme.colors.accent 
                            : theme.colors.border,
                          borderWidth: selectedUniversity?.id === university.id ? 2 : 1,
                        }
                      ]}
                      onPress={() => setSelectedUniversity(university)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.universityName, 
                        { color: selectedUniversity?.id === university.id ? theme.colors.accent : theme.colors.text }
                      ]}>
                        {university.name}
                      </Text>
                      <Text style={[styles.universityCity, { color: theme.colors.secondary }]}>
                        {university.city}
                      </Text>
                      {selectedUniversity?.id === university.id && (
                        <View style={[styles.universityCheckmark, { backgroundColor: theme.colors.accent }]}>
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Person Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              👤 About this person
            </Text>
            
            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  First Name *
                </Text>
                <View style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: firstName.length >= 2 ? theme.colors.accent + '40' : theme.colors.border,
                    borderWidth: firstName.length >= 2 ? 2 : 1,
                  },
                ]}>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="e.g. Emeka"
                    placeholderTextColor={theme.colors.secondary + '80'}
                    maxLength={30}
                  />
                  {firstName.length >= 2 && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                  )}
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  Age (16-60)
                </Text>
                <View style={[
                  styles.inputContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}>
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    value={personAge}
                    onChangeText={setPersonAge}
                    placeholder="22"
                    placeholderTextColor={theme.colors.secondary + '80'}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Enhanced Description with Hashtag Support */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              💭 Tell your story
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.secondary }]}>
              Share what happened (20-280 characters). Use #hashtags to make your post discoverable!
            </Text>
            
            <View style={[
              styles.textAreaContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: charCount >= 20 
                  ? theme.colors.accent + '40'
                  : charCount > 0 
                    ? theme.colors.warning + '60'
                    : theme.colors.border,
                borderWidth: charCount >= 20 ? 2 : 1,
              },
            ]}>
              <TextInput
                ref={contentRef}
                style={[styles.textArea, { color: theme.colors.text }]}
                value={content}
                onChangeText={handleContentChange}
                onSelectionChange={handleSelectionChange}
                placeholder={selectedFlag === null 
                  ? "Share your general thoughts or experience... Use #hashtags like #dating #university #friendship"
                  : selectedFlag === 'red'
                    ? "Describe the concerning behavior... Use #hashtags like #redflag #dating #toxic #warning"
                    : "Tell us about the positive qualities... Use #hashtags like #greenflag #sweet #dating #goals"
                }
                placeholderTextColor={theme.colors.secondary + '60'}
                multiline
                numberOfLines={6}
                maxLength={280}
                textAlignVertical="top"
              />
              
              <View style={styles.textAreaFooter}>
                <View style={styles.hashtagHint}>
                  <Ionicons name="pricetag" size={16} color={theme.colors.accent} />
                  <Text style={[styles.hashtagHintText, { color: theme.colors.secondary }]}>
                    Type # for hashtag suggestions
                  </Text>
                </View>
                <View style={styles.charCountContainer}>
                  <Text style={[
                    styles.charCountText,
                    {
                      color: charCount >= 20 
                        ? (charCount > 250 ? theme.colors.warning : theme.colors.accent)
                        : charCount > 0
                          ? theme.colors.warning
                          : theme.colors.secondary
                    }
                  ]}>
                    {charCount}/280
                  </Text>
                  {charCount < 20 && charCount > 0 && (
                    <Text style={[styles.needMoreText, { color: theme.colors.warning }]}>
                      {20 - charCount} more needed
                    </Text>
                  )}
                  {charCount >= 20 && (
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.accent} />
                  )}
                </View>
              </View>
            </View>

            {/* Hashtag Tips */}
            {!isTypingHashtag && (
              <View style={styles.tipsContainer}>
                <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
                  💡 Hashtag Tips:
                </Text>
                <Text style={[styles.tipsText, { color: theme.colors.secondary }]}>
                  • Use #hashtags to make your post discoverable
                </Text>
                <Text style={[styles.tipsText, { color: theme.colors.secondary }]}>
                  • Type # to see suggestions based on what you're writing
                </Text>
                <Text style={[styles.tipsText, { color: theme.colors.secondary }]}>
                  • Popular tags: #dating #friendship #university #study #life
                </Text>
              </View>
            )}
          </View>

          {/* Preview */}
          {firstName.length >= 2 && content.length >= 20 && selectedUniversity && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                👀 Preview
              </Text>
              
              <View style={[
                styles.postPreview, 
                { 
                  backgroundColor: theme.colors.surface, 
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 4,
                }
              ]}>
                <View style={styles.previewHeader}>
                  <Text style={[styles.previewName, { color: theme.colors.text }]}>
                    {getSelectedFlag().emoji} {firstName}
                    {personAge && ` (${personAge})`}
                  </Text>
                  <View style={[
                    styles.previewFlag, 
                    { backgroundColor: getSelectedFlag().color + '20' }
                  ]}>
                    <Text style={[
                      styles.previewFlagText, 
                      { color: getSelectedFlag().color }
                    ]}>
                      {getSelectedFlag().label}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.previewUniversity, { color: theme.colors.secondary }]}>
                  📍 {selectedUniversity.name}
                </Text>
                <View style={styles.previewContentContainer}>
                  {renderPreviewContent(content)}
                </View>
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>

      {/* Hashtag Suggestions Modal */}
      <Modal
        visible={showSuggestions && suggestions.length > 0}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSuggestions(false)}
        >
          <View 
            style={[
              styles.suggestionsContainer, 
              { backgroundColor: theme.colors.primary }
            ]}
          >
            <View style={[styles.suggestionsHeader, { borderBottomColor: theme.colors.border }]}>
              <Ionicons name="pricetag" size={18} color={theme.colors.accent} />
              <Text style={[styles.suggestionsTitle, { color: theme.colors.text }]}>
                {currentHashtag ? `Hashtags matching "${currentHashtag}"` : 'Trending Hashtags'}
              </Text>
            </View>
            
            <FlatList
              data={suggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={(item) => item.name || item.id?.toString()}
              style={styles.suggestionsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );

  // Helper function to render preview content with highlighted hashtags
  function renderPreviewContent(text) {
    if (!text) return null;

    const parts = [];
    const hashtagRegex = /#[\w\u00C0-\u017F\u0400-\u04FF]+/g;
    let lastIndex = 0;

    text.replace(hashtagRegex, (match, index) => {
      // Add text before hashtag
      if (index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, index),
          key: `text-${index}`
        });
      }
      
      // Add hashtag
      parts.push({
        type: 'hashtag',
        content: match,
        key: `hashtag-${index}`
      });
      
      lastIndex = index + match.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
        key: `text-end`
      });
    }

    return (
      <Text style={[styles.previewContent, { color: theme.colors.secondary }]}>
        {parts.map((part) => {
          if (part.type === 'hashtag') {
            return (
              <Text
                key={part.key}
                style={[
                  styles.previewContent,
                  {
                    color: theme.colors.accent,
                    fontWeight: '600',
                  }
                ]}
              >
                {part.content}
              </Text>
            );
          } else {
            return (
              <Text key={part.key} style={[styles.previewContent, { color: theme.colors.secondary }]}>
                {part.content}
              </Text>
            );
          }
        })}
      </Text>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  postButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  validationContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  validationList: {
    flexDirection: 'row',
    gap: 8,
  },
  validationItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  validationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  
  // Image styles
  imageContainer: {
    marginBottom: 16,
  },
  selectedImageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 3/4,
    maxWidth: 250,
    alignSelf: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 4,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 8,
  },
  addImageButton: {
    width: '100%',
    aspectRatio: 3/4,
    maxWidth: 250,
    alignSelf: 'center',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addImageIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 16,
    fontWeight: '600',
  },
  requiredText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Flag selection styles
  flagOptions: {
    gap: 12,
  },
  flagOption: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  flagHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  flagEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flagEmoji: {
    fontSize: 24,
  },
  flagContent: {
    flex: 1,
  },
  flagLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  flagDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // University selection styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  universityScroll: {
    marginBottom: 16,
  },
  universityOptions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 4,
  },
  universityOption: {
    minWidth: 120,
    padding: 16,
    borderRadius: 12,
    position: 'relative',
    alignItems: 'center',
  },
  universityName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  universityCity: {
    fontSize: 12,
    textAlign: 'center',
  },
  universityCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form input styles
  formRow: {
    flexDirection: "row",
    gap: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },

  // Enhanced text area styles
  textAreaContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  textArea: {
    fontSize: 16,
    padding: 16,
    height: 120,
    textAlignVertical: 'top',
  },
  textAreaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  hashtagHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hashtagHintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  charCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  charCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
  needMoreText: {
    fontSize: 10,
    fontWeight: "500",
  },

  // Tips styles
  tipsContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 12,
    marginBottom: 2,
  },

  // Preview styles
  postPreview: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  previewName: {
    fontSize: 16,
    fontWeight: "700",
  },
  previewFlag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  previewFlagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  previewUniversity: {
    fontSize: 13,
    marginBottom: 12,
  },
  previewContentContainer: {
    marginBottom: 4,
  },
  previewContent: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Hashtag suggestion modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    width: '90%',
    maxHeight: 400,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  suggestionCount: {
    fontSize: 12,
  },
  
  bottomSpacer: {
    height: 40,
  },
});