// api/selfie.js - Updated with dynamic API configuration
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

export const verifySelfie = async (uri) => {
  const token = await AsyncStorage.getItem("accessToken");
  const formData = new FormData();
  formData.append("selfie", {
    uri,
    name: "selfie.jpg",
    type: "image/jpeg",
  });
  
  const response = await axios.post(`${API_BASE_URL}/api/users/verify-selfie/`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getSelfieStatus = async () => {
  const token = await AsyncStorage.getItem("accessToken");
  const response = await axios.get(`${API_BASE_URL}/api/users/selfie-status/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};