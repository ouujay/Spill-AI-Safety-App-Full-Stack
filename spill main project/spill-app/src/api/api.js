// api/api.js - COMPLETE FIXED VERSION
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "./config";

// ---------- Helper: auth headers ----------
const authHeaders = async () => {
  const token = await AsyncStorage.getItem("accessToken");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

// ============= FEED FUNCTIONS =============
export async function getFeed(params = {}) {
  try {
    console.log("📄 Fetching feed with params:", params);

    const {
      scope = "for_you",
      page_size = 20,
      cursor = null,
      name = "",
      university_id = null,
      age = "",
      min_age = null,
      max_age = null,
      page = 1,
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append("scope", scope);
    queryParams.append("page_size", String(page_size));
    if (cursor) queryParams.append("cursor", cursor);
    if (page) queryParams.append("page", String(page));
    if (name) queryParams.append("name", name);
    if (university_id) queryParams.append("university_id", String(university_id));
    if (age) queryParams.append("age", age);
    if (min_age) queryParams.append("min_age", String(min_age));
    if (max_age) queryParams.append("max_age", String(max_age));

    const url = `${API_BASE_URL}/api/posts/feed/?${queryParams}`;
    const headers = await authHeaders();
    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Feed API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      items: data.items || data.results || [],
      results: data.results || data.items || [],
      next_cursor: data.next_cursor || null,
      has_more: data.has_more || false,
      count: data.count || (data.items?.length || data.results?.length || 0),
    };
  } catch (error) {
    console.error("🚨 getFeed error:", error);
    throw error;
  }
}

// ============= POST DETAIL FUNCTIONS =============
export async function getPostDetail(postId) {
  try {
    console.log("📖 Getting post detail:", postId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/`, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get post detail failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Post detail loaded:", data);
    return data;
  } catch (error) {
    console.error("❌ Get post detail error:", error);
    throw error;
  }
}

// ============= CREATE POST FUNCTIONS =============
export async function createPost(postData) {
  try {
    console.log("📝 Creating post:", postData);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/create/`, {
      method: "POST",
      headers,
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Create post failed:", response.status, errorData);
      throw new Error(`Create post failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Post created successfully:", data);
    return data;
  } catch (error) {
    console.error("❌ Create post error:", error);
    throw error;
  }
}

// ============= REPLIES/COMMENTS FUNCTIONS =============
export async function getReplies(postId, page = 1, pageSize = 10) {
  try {
    console.log(`💬 Getting replies for post ${postId}`);

    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });

    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/${postId}/replies/?${params}`,
      { headers }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Get replies failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Replies loaded:", data);
    return data;
  } catch (error) {
    console.error("❌ Get replies error:", error);
    throw error;
  }
}

export async function createReply(postId, content) {
  try {
    console.log(`💬 Creating reply for post ${postId}:`, content);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/reply/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Create reply failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Reply created:", data);
    return data;
  } catch (error) {
    console.error("❌ Create reply error:", error);
    throw error;
  }
}

// ============= REACTION FUNCTIONS =============
export async function likePost(postId) {
  try {
    console.log("👍 Liking post:", postId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/react/${postId}/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reaction: "up" }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Like failed:", response.status, errorData);
      throw new Error(`Like failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Post liked:", data);
    return data;
  } catch (error) {
    console.error("❌ Like error:", error);
    throw error;
  }
}

export async function removeLike(postId) {
  try {
    console.log("👎 Removing like from post:", postId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/react/${postId}/remove/`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Remove like failed:", response.status, errorData);
      throw new Error(`Remove like failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Like removed:", data);
    return data;
  } catch (error) {
    console.error("❌ Remove like error:", error);
    throw error;
  }
}

export async function likeReply(replyId) {
  try {
    console.log("👍 Liking reply:", replyId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/react/${replyId}/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reaction: "up" }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Like reply failed:", response.status, errorData);
      throw new Error(`Like reply failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Reply liked:", data);
    return data;
  } catch (error) {
    console.error("❌ Like reply error:", error);
    throw error;
  }
}

export async function removeReplyLike(replyId) {
  try {
    console.log("👎 Removing like from reply:", replyId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/react/${replyId}/remove/`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Remove reply like failed:", response.status, errorData);
      throw new Error(`Remove reply like failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Reply like removed:", data);
    return data;
  } catch (error) {
    console.error("❌ Remove reply like error:", error);
    throw error;
  }
}

// ============= FLAG VOTING FUNCTIONS =============
export async function flagVotePost(postId, vote) {
  try {
    console.log(`🚩 Flag voting post ${postId}: ${vote}`);

    if (!['red', 'green'].includes(vote)) {
      throw new Error("Vote must be 'red' or 'green'");
    }

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/flagvote/${postId}/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ vote }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Flag vote failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Flag vote recorded:", data);
    return data;
  } catch (error) {
    console.error("❌ Flag vote error:", error);
    throw error;
  }
}

export async function removeFlagVote(postId) {
  try {
    console.log("🚩 Removing flag vote from post:", postId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/flagvote/${postId}/remove/`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Remove flag vote failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Flag vote removed:", data);
    return data;
  } catch (error) {
    console.error("❌ Remove flag vote error:", error);
    throw error;
  }
}

// ============= SAVE/UNSAVE FUNCTIONS =============
export async function savePost(postId) {
  try {
    console.log("💾 Saving post:", postId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/save/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ post_id: postId }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Save post failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Post saved:", data);
    return data;
  } catch (error) {
    console.error("❌ Save post error:", error);
    throw error;
  }
}

export async function removeSavedPost(postId) {
  try {
    console.log("💾 Removing saved post:", postId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/save/`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ post_id: postId }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Remove saved post failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Saved post removed:", data);
    return data;
  } catch (error) {
    console.error("❌ Remove saved post error:", error);
    throw error;
  }
}

// ============= SEARCH FUNCTIONS =============
export async function searchPosts(query, type = "all") {
  try {
    console.log(`🔍 Searching for: "${query}" with type: "${type}"`);
    
    if (!query.trim()) {
      return { posts: [], universities: [], hashtags: [] };
    }

    const params = new URLSearchParams({
      q: query.trim(),
      type: type,
    });

    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/search/?${params}`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Search API failed:", response.status, errorText);
      throw new Error(`Search failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Search results:", data);
    return data;
  } catch (error) {
    console.error("❌ Search error:", error);
    throw error;
  }
}

export async function getTrendingHashtags(limit = 10, days = 7) {
  try {
    console.log(`📈 Getting trending hashtags (limit: ${limit}, days: ${days})`);

    // Call the search endpoint with empty query to get trending data
    const params = new URLSearchParams({
      q: "", // Empty query triggers trending response
      type: "hashtags",
    });

    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/search/?${params}`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Trending hashtags API failed:", response.status, errorText);
      throw new Error(`Trending hashtags failed: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Trending hashtags data:", data);

    // Return trending hashtags from the API response
    return data.trending || data.hashtags_trending || [];
  } catch (error) {
    console.error("❌ Get trending hashtags error:", error);
    throw error;
  }
}

// FIXED: Hashtag posts function
export async function getHashtagPosts(tagName, params = {}) {
  const cleanName = (tagName || "").toString().replace(/^#/, "").trim();
  if (!cleanName) {
    throw new Error("Invalid hashtag name");
  }

  try {
    console.log(`🔍 Getting posts for hashtag: #${cleanName}`, params);
    
    // Extract parameters with defaults
    const { page = 1, page_size = 20 } = params;
    
    // OPTION 1: Try the dedicated hashtag endpoint first
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        page_size: String(page_size),
      });

      const headers = await authHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/posts/hashtags/${encodeURIComponent(cleanName)}/posts/?${queryParams}`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Hashtag posts loaded via dedicated endpoint:", data);
        return {
          results: data.results || data.items || [],
          items: data.results || data.items || [],
          count: data.count || (data.results?.length || data.items?.length || 0),
          has_more: data.has_more || false,
        };
      }
    } catch (endpointError) {
      console.log("Dedicated hashtag endpoint failed, trying search fallback...");
    }
    
    // OPTION 2: Fallback to search API (which works)
    console.log("Using search API fallback for hashtag posts...");
    const searchResults = await searchPosts(`#${cleanName}`, "posts");
    
    console.log("✅ Hashtag posts loaded via search:", searchResults);
    
    return {
      results: searchResults.posts || [],
      items: searchResults.posts || [],
      count: searchResults.posts?.length || 0,
      has_more: false,
    };
  } catch (error) {
    console.error("❌ Get hashtag posts error:", error);
    throw error;
  }
}

// FIXED: University posts function
export async function getUniversityPosts(id, params = {}) {
  if (!id) {
    throw new Error("University ID is required");
  }

  try {
    console.log(`🏫 Getting posts for university: ${id}`, params);
    
    // Extract parameters with defaults
    const { page = 1, page_size = 20 } = params;
    
    const queryParams = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });

    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/universities/${id}/posts/?${queryParams}`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`University posts failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ University posts loaded:", data);
    return {
      results: data.results || data.items || [],
      items: data.results || data.items || [],
      count: data.count || (data.results?.length || data.items?.length || 0),
      has_more: data.has_more || false,
    };
  } catch (error) {
    console.error("❌ Get university posts error:", error);
    throw error;
  }
}

export async function getUserPosts(targetUserId, cursor = null) {
  try {
    console.log(`👤 Getting posts for user ${targetUserId}`, cursor ? 
      `cursor: ${cursor}` : "");
    const headers = await authHeaders();
    const url = cursor ? 
      `${API_BASE_URL}/api/posts/users/${targetUserId}/posts/?cursor=${cursor}` : 
      `${API_BASE_URL}/api/posts/users/${targetUserId}/posts/`;
    
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Get user posts failed:", response.status, errorData);
      throw new Error(`Get user posts failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ User posts fetched:", data);
    return data;
  } catch (error) {
    console.error("❌ Get user posts error:", error);
    throw error;
  }
}

// ============= HELPER FUNCTIONS =============

// Determine post interaction type
export function getPostInteractionType(post) {
  if (!post) return null;
  
  // Check interaction_mode first
  if (post.interaction_mode === "like_only") return 'tea';
  if (post.interaction_mode === "flag_vote") return 'flag';
  
  // Fallback: check flag field
  if (post.flag === "red" || post.flag === "green") return 'flag';
  if (post.flag === null || post.flag === undefined) return 'tea';
  
  // Default to tea for unknown cases
  return 'tea';
}

// Smart reaction handler that determines the right API call
export async function reactToPost(postId, post, reactionType) {
  const interactionType = getPostInteractionType(post);
  console.log(`🔥 React to post ${postId}: ${reactionType} (${interactionType} post)`);
  
  if (interactionType === 'tea') {
    // Tea posts use like/unlike
    if (reactionType === 'like') {
      const isCurrentlyLiked = post.user_reaction === "up";
      return isCurrentlyLiked ? removeLike(postId) : likePost(postId);
    }
    throw new Error(`Invalid reaction type: ${reactionType} for tea post`);
  } 
  
  if (interactionType === 'flag') {
    // Flag posts use red/green voting
    if (['red', 'green'].includes(reactionType)) {
      const currentVote = post.user_flag_vote;
      if (currentVote === reactionType) {
        // Remove vote if clicking same vote
        return removeFlagVote(postId);
      } else {
        // Vote for the selected option
        return flagVotePost(postId, reactionType);
      }
    }
    throw new Error(`Invalid reaction type: ${reactionType} for flag post`);
  }
  
  throw new Error(`Unknown interaction type: ${interactionType}`);
}

// ============= NAVIGATION HELPERS =============
export function openHashtag(tagLike, navigation) {
  const raw = (tagLike?.name ?? tagLike ?? "").toString().trim();
  const name = raw.replace(/^#/, "");
  if (!name) {
    console.warn("Cannot open hashtag: name is undefined or empty");
    return;
  }

  navigation.navigate("ExploreList", {
    type: "hashtag",
    id: name,
    title: `#${name}`,
  });
}

export function openUniversity(university, navigation) {
  const id = university?.id ?? university;
  if (!id) {
    console.warn("Cannot open university: ID is undefined");
    return;
  }

  navigation.navigate("ExploreList", {
    type: "university",
    id,
    title: university?.name || `University ${id}`,
  });
}

// ============= TEST FUNCTIONS =============
export async function testFeedConnection() {
  try {
    console.log("🧪 Testing feed connection...");

    const headers = await authHeaders();
    const testUrl = `${API_BASE_URL}/api/posts/feed/?scope=for_you&page_size=1`;

    const response = await fetch(testUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, status: response.status, error: errorText };
    }

    const data = await response.json();

    return {
      success: true,
      status: response.status,
      hasData: !!(data.items || data.results),
      count: data.items?.length || data.results?.length || 0,
    };
  } catch (error) {
    console.error("🚨 Feed connection test error:", error);
    return { success: false, error: error.message };
  }
}

// ============= DEFAULT EXPORT =============
export default {
  // Feed
  getFeed,
  testFeedConnection,
  
  // Posts
  getPostDetail,
  createPost,
  getUserPosts,
  
  // Replies/Comments  
  getReplies,
  createReply,
  
  // Reactions
  likePost,
  removeLike,
  likeReply,
  removeReplyLike,
  
  // Flag Voting
  flagVotePost,
  removeFlagVote,
  
  // Save/Unsave
  savePost,
  removeSavedPost,
  
  // Search Functions
  searchPosts,
  getTrendingHashtags,
  getHashtagPosts,
  getUniversityPosts,
  
  // Helpers
  getPostInteractionType,
  reactToPost,
  
  // Navigation
  openHashtag,
  openUniversity,
};