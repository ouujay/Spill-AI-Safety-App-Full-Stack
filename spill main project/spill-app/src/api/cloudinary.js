// api/cloudinary.js - FIXED: Added authentication headers and removed duplicate imports
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

/**
 * Get cloudinary signature from your Django backend
 */
export async function getCloudinarySignature(resourceType = "image") {
  try {
    // Get auth token for authenticated request
    const token = await AsyncStorage.getItem("accessToken");
    const headers = {
      "Content-Type": "application/json",
    };
    
    // Add Bearer token if available
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/posts/uploads/signature/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        resource_type: resourceType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get signature: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Got Cloudinary signature:", {
      cloud_name: data.cloud_name,
      api_key: data.api_key,
      timestamp: data.timestamp,
      folder: data.folder,
      hasSignature: !!data.signature
    });

    return data;
  } catch (error) {
    console.error("❌ Failed to get Cloudinary signature:", error);
    throw error;
  }
}

/**
 * Upload file to Cloudinary with signature
 */
export function uploadToCloudinary({ fileUri, resourceType = "image", signatureData, onProgress }) {
  return new Promise((resolve, reject) => {
    try {
      const { cloud_name, api_key, timestamp, signature, folder } = signatureData;
      
      if (!cloud_name || !api_key || !signature || !timestamp) {
        reject(new Error("Missing required signature parameters"));
        return;
      }

      const xhr = new XMLHttpRequest();
      const url = `https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`;
      
      console.log("🚀 Starting Cloudinary upload to:", url);

      xhr.open("POST", url, true);
      
      xhr.onload = () => {
        console.log("📡 Upload completed with status:", xhr.status);
        
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            console.log("✅ Upload successful:", result.secure_url);
            resolve(result);
          } catch (parseError) {
            console.error("❌ Failed to parse success response:", parseError);
            reject(new Error("Failed to parse upload response"));
          }
        } else {
          console.error("❌ Upload failed with status:", xhr.status);
          console.error("❌ Response:", xhr.responseText);
          
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(new Error(`Upload failed: ${errorResponse.error?.message || xhr.responseText}`));
          } catch (parseError) {
            reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
          }
        }
      };
      
      xhr.onerror = (error) => {
        console.error("❌ Network error during upload:", error);
        reject(new Error("Network error during upload"));
      };
      
      xhr.ontimeout = () => {
        console.error("❌ Upload timeout");
        reject(new Error("Upload timeout"));
      };

      // Set timeout (30 seconds)
      xhr.timeout = 30000;
      
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            console.log("📊 Upload progress:", progress + "%");
            onProgress(progress);
          }
        };
      }
      
      const formData = new FormData();
      
      // File must be first
      const fileObject = {
        uri: fileUri,
        name: resourceType === "video" ? "upload.mp4" : "upload.jpg",
        type: resourceType === "video" ? "video/mp4" : "image/jpeg"
      };
      
      console.log("📁 Adding file to form:", fileObject);
      formData.append("file", fileObject);
      
      // Add signed parameters in the exact order they were signed
      formData.append("api_key", api_key);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);
      
      // Debug the form data being sent
      console.log("📤 Sending form data with parameters:", {
        api_key,
        timestamp,
        folder,
        hasSignature: !!signature,
        fileUri
      });
      
      xhr.send(formData);
      
    } catch (error) {
      console.error("❌ Error setting up upload:", error);
      reject(error);
    }
  });
}

/**
 * Complete upload flow: get signature + upload
 */
export async function uploadImage(fileUri, onProgress) {
  try {
    console.log("🎯 Starting complete image upload flow for:", fileUri);
    
    // Step 1: Get signature
    const signatureData = await getCloudinarySignature("image");
    
    // Step 2: Upload with signature
    const result = await uploadToCloudinary({
      fileUri,
      resourceType: "image",
      signatureData,
      onProgress
    });
    
    console.log("🎉 Complete upload successful:", result.secure_url);
    return result;
    
  } catch (error) {
    console.error("❌ Complete upload failed:", error);
    throw error;
  }
}

/**
 * Complete upload flow: get signature + upload video
 */
export async function uploadVideo(fileUri, onProgress) {
  try {
    console.log("🎯 Starting complete video upload flow for:", fileUri);
    
    // Step 1: Get signature
    const signatureData = await getCloudinarySignature("video");
    
    // Step 2: Upload with signature
    const result = await uploadToCloudinary({
      fileUri,
      resourceType: "video", 
      signatureData,
      onProgress
    });
    
    console.log("🎉 Complete video upload successful:", result.secure_url);
    return result;
    
  } catch (error) {
    console.error("❌ Complete video upload failed:", error);
    throw error;
  }
}