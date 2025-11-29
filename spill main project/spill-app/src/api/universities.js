// api/universities.js - Centralized university API calls
import { api } from "./client"; // Uses ${API_BASE_URL}/api/users

// Get all universities with search/filter options
export const getUniversities = async (params = {}) => {
  try {
    const response = await api.get("/universities/", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching universities:", error);
    throw error;
  }
};

// Get universities by country
export const getUniversitiesByCountry = async (countryId) => {
  try {
    const response = await api.get(`/universities/`, { 
      params: { country: countryId } 
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching universities by country:", error);
    throw error;
  }
};

// Search universities by name
export const searchUniversities = async (query) => {
  try {
    const response = await api.get("/universities/", { 
      params: { search: query } 
    });
    return response.data;
  } catch (error) {
    console.error("Error searching universities:", error);
    throw error;
  }
};

// Get single university details
export const getUniversityById = async (universityId) => {
  try {
    const response = await api.get(`/universities/${universityId}/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching university details:", error);
    throw error;
  }
};