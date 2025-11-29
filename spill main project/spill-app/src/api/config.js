// api/config.js - PRODUCTION CONFIGURATION
import { Platform } from "react-native";
import Constants from 'expo-constants';

// PRODUCTION MODE: Set to true for app store builds
const USE_PRODUCTION = false; // ← SET TO true FOR DEPLOYMENT

// Get your laptop's IP address (for local development only)
const LAPTOP_IP = "10.181.95.15"; // Your current laptop IP

// Determine API base URL based on environment and platform
const getApiBaseUrl = () => {
  // Use production when USE_PRODUCTION is true
  if (USE_PRODUCTION) {
    return "https://spilleu-esfdc6baccdvhjde.westeurope-01.azurewebsites.net";
  }
  
  // Local development (only when USE_PRODUCTION is false)
  if (Constants.appOwnership === 'expo') {
    return `http://${LAPTOP_IP}:8000`;
  }
  
  // If running on emulator/simulator
  return Platform.select({
    ios: "http://127.0.0.1:8000",
    android: "http://10.0.2.2:8000",
    default: "http://127.0.0.1:8000",
  });
};

// Flask microservice URL (always production)
const getFlaskUrl = () => {
  return "https://genapp-dgeugtftfmaea7ds.southafricanorth-01.azurewebsites.net";
};

// Django web app URL (same as API)
const getDjangoWebUrl = () => {
  return getApiBaseUrl();
};

export const API_BASE_URL = getApiBaseUrl(); // Django REST API
export const FLASK_BASE_URL = getFlaskUrl(); // Flask microservice
export const DJANGO_WEB_URL = getDjangoWebUrl(); // Django web app

console.log('🚀 Configuration Mode:', USE_PRODUCTION ? 'PRODUCTION (HTTPS)' : 'LOCAL DEVELOPMENT (HTTP)');
console.log('🌐 Django API Base URL:', API_BASE_URL);
console.log('🔬 Flask Base URL:', FLASK_BASE_URL);
console.log('🌍 Django Web App URL:', DJANGO_WEB_URL);
console.log('🔒 Protocol Check:', API_BASE_URL.startsWith('https') ? 'HTTPS ✅' : 'HTTP ⚠️');