import { api } from "./client";

// Get current selfie verification status
export async function getSelfieStatus() {
  try {
    const { data } = await api.get("/selfie-status/");
    return data; // { selfie_verified, locked, retry_count, appeal_requested, attempts_left? }
  } catch (error) {
    console.error("Error fetching selfie status:", error);
    throw error;
  }
}

// Submit appeal request
export async function appealSelfie(reason = "") {
  try {
    const { data } = await api.patch("/selfie-appeal/", { reason });
    return data;
  } catch (error) {
    console.error("Error submitting appeal:", error);
    throw error;
  }
}

// Verify selfie image
export async function verifySelfie(uri) {
  try {
    const formData = new FormData();
    formData.append("selfie", {
      uri,
      type: "image/jpeg",
      name: "selfie.jpg",
    });
    
    const { data } = await api.post("/verify-selfie/", formData, {
      headers: { 
        "Content-Type": "multipart/form-data" 
      },
      timeout: 30000 // Longer timeout for file upload
    });
    
    return data; // { success, confidence, message, attempts_left, locked }
  } catch (error) {
    console.error("Error verifying selfie:", error);
    throw error;
  }
}

// Get user profile
export async function getUserProfile() {
  try {
    const { data } = await api.get("/profile/");
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
}

// Update user profile
export async function updateUserProfile(profileData) {
  try {
    const { data } = await api.patch("/profile/", profileData);
    return data;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}