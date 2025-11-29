// api/notifications.js - COMPLETE UPDATED VERSION with all missing functions
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

// Helper: auth headers
const authHeaders = async () => {
  const token = await AsyncStorage.getItem("accessToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// ============= HASHTAG FUNCTIONS =============

export async function followHashtag(hashtagName) {
  try {
    const cleanName = (hashtagName || "").toString().replace(/^#/, "").trim();
    if (!cleanName) {
      throw new Error("Invalid hashtag name");
    }
    
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/follow/hashtag/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: cleanName }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Follow hashtag failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Follow hashtag error:", error);
    throw error;
  }
}

export async function unfollowHashtag(hashtagName) {
  try {
    const cleanName = (hashtagName || "").toString().replace(/^#/, "").trim();
    if (!cleanName) {
      throw new Error("Invalid hashtag name");
    }
    
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/follow/hashtag/`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ name: cleanName }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unfollow hashtag failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Unfollow hashtag error:", error);
    throw error;
  }
}

export async function getHashtagStats(hashtagName) {
  try {
    const cleanName = (hashtagName || "").toString().replace(/^#/, "").trim();
    if (!cleanName) {
      throw new Error("Invalid hashtag name");
    }
    
    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/hashtags/${encodeURIComponent(cleanName)}/stats/`,
      { headers }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get hashtag stats failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Get hashtag stats error:", error);
    throw error;
  }
}

// ============= UNIVERSITY FUNCTIONS =============

export async function followUniversity(universityId) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/follow/university/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ university_id: universityId }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Follow university failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Follow university error:", error);
    throw error;
  }
}

export async function unfollowUniversity(universityId) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/follow/university/`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ university_id: universityId }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unfollow university failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Unfollow university error:", error);
    throw error;
  }
}

// FIXED: Add the missing getUniversityStats function
export async function getUniversityStats(universityId) {
  try {
    if (!universityId) {
      throw new Error("Invalid university ID");
    }
    
    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/universities/${encodeURIComponent(universityId)}/stats/`,
      { headers }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get university stats failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Get university stats error:", error);
    throw error;
  }
}

// ============= USER FUNCTIONS =============

export async function followUser(userId) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/follow/user/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ user_id: userId }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Follow user failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Follow user error:", error);
    throw error;
  }
}

export async function unfollowUser(userId) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/follow/user/`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ user_id: userId }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unfollow user failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Unfollow user error:", error);
    throw error;
  }
}

// ============= FOLLOW STATUS FUNCTIONS =============

export async function getFollowStatus(params = {}) {
  try {
    const headers = await authHeaders();
    const queryParams = new URLSearchParams();
    
    if (params.user_ids && params.user_ids.length > 0) {
      queryParams.append('user_ids', params.user_ids.join(','));
    }
    if (params.hashtag_names && params.hashtag_names.length > 0) {
      queryParams.append('hashtag_names', params.hashtag_names.join(','));
    }
    if (params.university_ids && params.university_ids.length > 0) {
      queryParams.append('university_ids', params.university_ids.join(','));
    }
    
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/follow/status/?${queryParams}`,
      { headers }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get follow status failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Get follow status error:", error);
    throw error;
  }
}

// ============= NOTIFICATION FUNCTIONS =============

export async function getNotifications(page = 1, pageSize = 20) {
  try {
    const headers = await authHeaders();
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/notifications/?${params}`,
      { headers }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get notifications failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Get notifications error:", error);
    throw error;
  }
}

export async function markNotificationRead(notificationId) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/notifications/mark-read/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ notification_id: notificationId }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mark notification read failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Mark notification read error:", error);
    throw error;
  }
}

export async function markAllNotificationsRead() {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/notifications/mark-all-read/`, {
      method: "POST",
      headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mark all notifications read failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    throw error;
  }
}

// ============= SEARCH FUNCTIONS =============

export async function searchHashtags(query, options = {}) {
  try {
    const params = new URLSearchParams({
      q: query || '',
      limit: String(options.limit || 10),
      ...(options.trending && { trending: 'true' }),
      ...(options.min_posts && { min_posts: String(options.min_posts) }),
    });
    
    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/notifications/search/hashtags/?${params}`,
      { headers }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search hashtags failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Search hashtags error:", error);
    throw error;
  }
}

// ============= PUSH NOTIFICATION FUNCTIONS =============

export async function registerPushToken(token, deviceType = 'expo') {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/register-token/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ 
        token,
        device_type: deviceType,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Register push token failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Register push token error:", error);
    throw error;
  }
}

export async function unregisterPushToken(token) {
  try {
    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/notifications/unregister-token/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ token }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Unregister push token failed: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error("Unregister push token error:", error);
    throw error;
  }
}

// ============= NOTIFICATION MESSAGE HELPERS =============

export function getNotificationMessage(notification) {
  if (!notification) return 'New notification';
  
  // Use actor's handle or anonymous name
  const actorName = notification.actor?.handle || notification.actor?.first_name || 'Someone';
  
  switch (notification.kind) {
    case 'NEW_POST_USER':
    case 'new_post_user':
      return `${actorName} posted something new`;
      
    case 'NEW_POST_HASHTAG':
    case 'new_post_hashtag':
      return `New post in a hashtag you follow`;
      
    case 'NEW_POST_UNI':
    case 'new_post_uni':
      return `New post from your university`;
      
    case 'COMMENT_ON_MY_POST':
    case 'comment_on_my_post':
      return `${actorName} commented on your post`;
      
    case 'LIKE_ON_MY_POST':
    case 'like_on_my_post':
      return `${actorName} liked your post`;
      
    case 'FLAG_VOTE_ON_MY_POST':
    case 'flag_vote_on_my_post':
      return `${actorName} voted on your flag post`;
      
    case 'new_follower':
      return `${actorName} started following you`;
      
    default:
      return 'New notification';
  }
}

export function getNotificationIcon(kind) {
  switch (kind) {
    case 'NEW_POST_USER':
    case 'new_post_user':
      return 'person';
      
    case 'NEW_POST_HASHTAG':
    case 'new_post_hashtag':
      return 'pricetag';
      
    case 'NEW_POST_UNI':
    case 'new_post_uni':
      return 'school';
      
    case 'COMMENT_ON_MY_POST':
    case 'comment_on_my_post':
      return 'chatbubble';
      
    case 'LIKE_ON_MY_POST':
    case 'like_on_my_post':
      return 'heart';
      
    case 'FLAG_VOTE_ON_MY_POST':
    case 'flag_vote_on_my_post':
      return 'flag';
      
    case 'new_follower':
      return 'person-add';
      
    default:
      return 'notifications';
  }
}

// ============= DEFAULT EXPORT =============
export default {
  // Message helpers - FIXED: Added these missing exports
  getNotificationMessage,
  getNotificationIcon,
  
  // Hashtag functions
  followHashtag,
  unfollowHashtag,
  getHashtagStats,
  
  // University functions
  followUniversity,
  unfollowUniversity,
  getUniversityStats,
  
  // User functions
  followUser,
  unfollowUser,
  
  // Follow status
  getFollowStatus,
  
  // Notifications
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  
  // Search
  searchHashtags,
  
  // Push notifications
  registerPushToken,
  unregisterPushToken,
};