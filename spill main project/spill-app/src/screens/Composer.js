// screens/Composer.js - Updated with theme integration and NO crop dialog
import React, { useState } from "react";
import { 
  View, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert, 
  StyleSheet,
  ScrollView,
  Dimensions,
  SafeAreaView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { getSignature, createPost, destroyCloudinary } from "../api/posts";
import { uploadToCloudinary } from "../api/cloudinary";
import { useTheme } from "../theme/ThemeProvider";

const { width } = Dimensions.get('window');

export default function Composer({ navigation }) {
  const { theme } = useTheme();
  const [content, setContent] = useState("");
  const [media, setMedia] = useState(null); // { uri, type: "image"|"video" }
  const [progress, setProgress] = useState(0);
  const [posting, setPosting] = useState(false);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "You need to allow photo access to upload images.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: [ImagePicker.MediaType.Images], // FIXED: Updated from deprecated MediaTypeOptions
        quality: 0.9,
        allowsEditing: false,  // 👈 DISABLED - no more crop dialog!
        // Removed aspect ratio since we're not cropping
      });
      
      if (res.canceled) return;
      
      let asset = res.assets[0];
      
      // Optional downscale huge images
      if (asset.width && asset.width > 2000) {
        const m = await ImageManipulator.manipulateAsync(
          asset.uri, 
          [{ resize: { width: 2000 } }], 
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        setMedia({ uri: m.uri, type: "image" });
      } else {
        setMedia({ uri: asset.uri, type: "image" });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const pickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "You need to allow photo access to upload videos.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: [ImagePicker.MediaType.Videos], // FIXED: Updated from deprecated MediaTypeOptions
        quality: 1,
        allowsEditing: false,  // 👈 DISABLED - no more crop dialog for videos too!
      });
      
      if (res.canceled) return;
      
      const asset = res.assets[0];
      setMedia({ uri: asset.uri, type: "video" });
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Error", "Failed to pick video. Please try again.");
    }
  };

  const clearMedia = () => setMedia(null);

  const onSubmit = async () => {
    // UPDATED: Allow text-only posts
    if (!content.trim() && !media) {
      Alert.alert("Nothing to post", "Add some text or pick a media.");
      return;
    }

    setPosting(true);
    let uploaded = null;
    
    try {
      let assetPayload = null;
      
      // Only upload to Cloudinary if there's media
      if (media) {
        console.log("Getting Cloudinary signature...");
        const sig = await getSignature();
        console.log("Cloudinary signature received:", {
          cloud_name: sig.cloud_name,
          api_key: sig.api_key,
          timestamp: sig.timestamp,
          folder: sig.folder,
          // Don't log the actual signature for security
          hasSignature: !!sig.signature
        });
        
        console.log("Starting Cloudinary upload...");
        const res = await uploadToCloudinary({
          fileUri: media.uri,
          resourceType: media.type === "video" ? "video" : "image",
          signatureData: sig, // Pass through unchanged
          onProgress: setProgress,
        });
        
        console.log("Cloudinary upload successful:", {
          public_id: res.public_id,
          secure_url: res.secure_url,
          width: res.width,
          height: res.height
        });
        
        uploaded = res;
        assetPayload = {
          public_id: res.public_id,
          secure_url: res.secure_url,
          resource_type: media.type === "video" ? "video" : "image",
          width: res.width || null,
          height: res.height || null,
          duration: res.duration || null,
          thumbnail_url: (res.eager && res.eager[0]?.secure_url) || null,
        };
      }
      
      console.log("Creating post with payload:", {
        content: content.substring(0, 50) + (content.length > 50 ? "..." : ""),
        hasAsset: !!assetPayload
      });
      
      // UPDATED: Pass asset only if it exists, otherwise pass null/undefined
      await createPost({ 
        content: content.trim(), 
        asset: assetPayload // This will be null for text-only posts
      });
      
      console.log("Post created successfully!");
      
      // Success
      Alert.alert("Success", "Post created successfully!", [
        {
          text: "OK",
          onPress: () => {
            setContent("");
            setMedia(null);
            setProgress(0);
            navigation.goBack();
          }
        }
      ]);
      
    } catch (e) {
      console.error("Post creation error:", e);
      
      // Rollback Cloudinary upload if it succeeded but post creation failed
      if (uploaded?.public_id) {
        console.log("Rolling back Cloudinary upload:", uploaded.public_id);
        await destroyCloudinary(uploaded.public_id);
      }
      
      Alert.alert("Post failed", `Error: ${e.message || "Please try again."}`);
    } finally {
      setPosting(false);
    }
  };

  // UPDATED: Allow posting with just text
  const canPost = (content.trim().length > 0 || media) && !posting;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          New Post
        </Text>
        
        <TouchableOpacity
          onPress={onSubmit}
          disabled={!canPost}
          style={[
            styles.postButton,
            {
              backgroundColor: canPost ? theme.colors.accent : theme.colors.surface,
            }
          ]}
        >
          <Text style={[
            styles.postButtonText,
            { color: canPost ? '#fff' : theme.colors.secondary }
          ]}>
            {posting ? "Posting..." : "Post"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Text Input */}
        <TextInput
          placeholder="What's happening at your uni? Use #hashtags to reach more people..."
          placeholderTextColor={theme.colors.secondary}
          multiline
          value={content}
          onChangeText={setContent}
          style={[
            styles.textInput,
            {
              color: theme.colors.text,
              borderColor: theme.colors.border,
            }
          ]}
          maxLength={280}
          autoFocus
        />

        {/* Character count */}
        <View style={styles.characterCount}>
          <Text style={[
            styles.characterCountText,
            { 
              color: content.length > 250 
                ? theme.colors.error || '#ef4444'
                : theme.colors.secondary 
            }
          ]}>
            {content.length}/280
          </Text>
        </View>

        {/* Media Preview */}
        {!!media && (
          <View style={[styles.mediaContainer, { borderColor: theme.colors.border }]}>
            {media.type === "image" ? (
              <Image 
                source={{ uri: media.uri }} 
                style={styles.mediaPreview} 
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.videoPlaceholder, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="videocam" size={32} color={theme.colors.accent} />
                <Text style={[styles.videoText, { color: theme.colors.text }]}>
                  Video selected
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              onPress={clearMedia} 
              style={[styles.removeButton, { backgroundColor: theme.colors.error || '#ef4444' }]}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Upload Progress */}
        {posting && progress > 0 && (
          <View style={[styles.progressContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressText, { color: theme.colors.text }]}>
                Uploading... {progress}%
              </Text>
              <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    backgroundColor: theme.colors.accent,
                    width: `${progress}%`
                  }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Media Buttons */}
        <View style={styles.mediaButtons}>
          <TouchableOpacity 
            onPress={pickImage} 
            style={[styles.mediaButton, { backgroundColor: theme.colors.surface }]}
            disabled={posting}
          >
            <Ionicons name="image-outline" size={20} color={theme.colors.accent} />
            <Text style={[styles.mediaButtonText, { color: theme.colors.text }]}>
              Add Photo
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={pickVideo} 
            style={[styles.mediaButton, { backgroundColor: theme.colors.surface }]}
            disabled={posting}
          >
            <Ionicons name="videocam-outline" size={20} color={theme.colors.accent} />
            <Text style={[styles.mediaButtonText, { color: theme.colors.text }]}>
              Add Video
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={[styles.tipsContainer, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="bulb-outline" size={16} color={theme.colors.accent} />
          <Text style={[styles.tipsText, { color: theme.colors.secondary }]}>
            Tip: Use #hashtags to help others discover your post!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  textInput: {
    minHeight: 120,
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  characterCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mediaContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  mediaButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  tipsText: {
    fontSize: 13,
    flex: 1,
  },
});