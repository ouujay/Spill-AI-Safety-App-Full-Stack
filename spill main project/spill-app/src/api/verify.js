// api/verify.js - Updated with dynamic API configuration
import axios from "axios";
import { FLASK_BASE_URL } from "./config";

export const verifySelfie = async (uri) => {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: "selfie.jpg",
    type: "image/jpeg",
  });

  const response = await axios.post(`${FLASK_BASE_URL}/predict-gender`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 10000,
  });

  return response.data;
};