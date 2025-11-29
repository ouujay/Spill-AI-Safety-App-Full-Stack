// api/posts.js - UPDATED VERSION with new functions
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

// ============= COMMENTS/REPLIES FUNCTIONS =============
export async function getReplies(postId, params = {}) {
  try {
    console.log("💬 Getting replies for post:", postId, params);

    const { page = 1, page_size = 20, sort = "new" } = params;

    const queryParams = new URLSearchParams();
    queryParams.append("page", String(page));
    queryParams.append("page_size", String(page_size));
    queryParams.append("sort", sort);

    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/${postId}/replies/?${queryParams}`,
      { headers }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get replies failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Replies loaded:", data);
    return data;
  } catch (error) {
    console.error("❌ Get replies error:", error);
    throw error;
  }
}

// FIXED: createReply function with proper threading support
export async function createReply(postId, contentOrData, parentId = null) {
  try {
    // Handle both string content and object data
    const content = typeof contentOrData === 'string' ? contentOrData : contentOrData.content;
    const parent = typeof contentOrData === 'object' ? contentOrData.parent : parentId;
    
    console.log("✏️ Creating reply for post:", postId, { content, parent });

    // Prepare reply data with proper threading
    const data = {
      content: content.trim(),
    };

    // If this is a reply to another comment, include parent info
    if (parent && parent !== postId) {
      data.parent = parent;
    }

    // Only validate that content is not empty
    if (!data.content || data.content.length === 0) {
      throw new Error("Comment cannot be empty");
    }

    console.log("📤 Sending reply data:", data);

    const headers = await authHeaders();
    
    // Use the dedicated reply endpoint
    const response = await fetch(`${API_BASE_URL}/api/posts/${postId}/reply/`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Create reply failed:", response.status, errorData);
      
      // Try to parse and give better error messages
      try {
        const parsedError = JSON.parse(errorData);
        if (parsedError.content && parsedError.content[0]) {
          throw new Error(`Content error: ${parsedError.content[0]}`);
        }
        if (parsedError.non_field_errors && parsedError.non_field_errors[0]) {
          throw new Error(`Validation error: ${parsedError.non_field_errors[0]}`);
        }
      } catch (parseErr) {
        // If parsing fails, use raw error
      }
      
      throw new Error(`Create reply failed: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    console.log("✅ Reply created successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Create reply error:", error);
    throw error;
  }
}

// ============= REACTION FUNCTIONS (Tea Posts & Comments) =============
export async function likePost(postId, reaction = "up") {
  try {
    console.log("❤️ Liking post:", postId, "reaction:", reaction);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/react/${postId}/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reaction }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Like failed:", response.status, errorData);
      throw new Error(`Like failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Like successful:", data);
    return data;
  } catch (error) {
    console.error("❌ Like post error:", error);
    throw error;
  }
}

export async function removeLike(postId) {
  try {
    console.log("💔 Removing like from post:", postId);

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

// ============= REPLY REACTION FUNCTIONS =============
// FIXED: Add the missing reactToReply function
export async function reactToReply(replyId, reaction = "up") {
  try {
    console.log("👍 Reacting to reply:", replyId, "reaction:", reaction);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/react/${replyId}/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reaction }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ React to reply failed:", response.status, errorData);
      throw new Error(`React to reply failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Reply reaction successful:", data);
    return data;
  } catch (error) {
    console.error("❌ React to reply error:", error);
    throw error;
  }
}

// FIXED: Add the missing removeReplyReaction function
export async function removeReplyReaction(replyId) {
  try {
    console.log("👎 Removing reaction from reply:", replyId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/react/${replyId}/remove/`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Remove reply reaction failed:", response.status, errorData);
      throw new Error(`Remove reply reaction failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Reply reaction removed:", data);
    return data;
  } catch (error) {
    console.error("❌ Remove reply reaction error:", error);
    throw error;
  }
}

// Keep the old function names for backward compatibility
export const likeReply = reactToReply;
export const removeReplyLike = removeReplyReaction;

// ============= FLAG VOTE FUNCTIONS (Red/Green Posts Only) =============
export async function flagVotePost(postId, vote) {
  try {
    if (!['red', 'green'].includes(vote)) {
      throw new Error(`Invalid vote: ${vote}. Must be 'red' or 'green'`);
    }

    console.log("🚩 Flag voting on post:", postId, "vote:", vote);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/flagvote/${postId}/`, {
      method: "POST",
      headers,
      body: JSON.stringify({ vote }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Flag vote failed:", response.status, errorData);
      throw new Error(`Flag vote failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Flag vote successful:", data);
    return data;
  } catch (error) {
    console.error("❌ Flag vote error:", error);
    throw error;
  }
}

export async function removeFlagVote(postId) {
  try {
    console.log("🚫 Removing flag vote from post:", postId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/flagvote/${postId}/remove/`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Remove flag vote failed:", response.status, errorData);
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

// ============= SAVE POST FUNCTIONS =============
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
      console.error("❌ Save post failed:", response.status, errorData);
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

// UPDATED: Use new function name for consistency
export async function unsavePost(postId) {
  try {
    console.log("🗑️ Unsaving post:", postId);

    const headers = await authHeaders();
    const response = await fetch(`${API_BASE_URL}/api/posts/save/`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ post_id: postId }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Unsave post failed:", response.status, errorData);
      throw new Error(`Unsave post failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Post unsaved:", data);
    return data;
  } catch (error) {
    console.error("❌ Unsave post error:", error);
    throw error;
  }
}

// Keep old function name for backward compatibility
export const removeSavedPost = unsavePost;

// NEW: Get Saved Posts List
export async function getSavedPosts(cursor = null) {
  try {
    console.log("📖 Fetching saved posts...", cursor ? `cursor: ${cursor}` : "");
    const headers = await authHeaders();
    const url = cursor ? 
      `${API_BASE_URL}/api/posts/saved/?cursor=${cursor}` : 
      `${API_BASE_URL}/api/posts/saved/`;
    
    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Get saved posts failed:", response.status, errorData);
      throw new Error(`Get saved posts failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log("✅ Saved posts fetched:", data);
    return data;
  } catch (error) {
    console.error("❌ Get saved posts error:", error);
    throw error;
  }
}

// NEW: Get User's Own Posts
export async function getUserPosts(userId = null, cursor = null) {
  try {
    const targetUserId = userId || 'me'; // 'me' for current user
    console.log("📖 Fetching user posts...", targetUserId, cursor ? `cursor: ${cursor}` : "");
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

// ============= CREATE POST FUNCTION =============
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
  console.log(`🔄 React to post ${postId}: ${reactionType} (${interactionType} post)`);
  
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

// ============= SEARCH & HASHTAG FUNCTIONS =============
export async function getHashtagPosts(tagName, page = 1, page_size = 20) {
  const cleanName = (tagName || "").toString().replace(/^#/, "").trim();
  if (!cleanName) {
    throw new Error("Invalid hashtag name");
  }

  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });

    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/hashtags/${encodeURIComponent(cleanName)}/posts/?${params}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Hashtag posts failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Get hashtag posts error:", error);
    throw error;
  }
}

export async function getUniversityPosts(id, page = 1, page_size = 20) {
  if (!id) {
    throw new Error("University ID is required");
  }

  try {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(page_size),
    });

    const headers = await authHeaders();
    const response = await fetch(
      `${API_BASE_URL}/api/posts/universities/${id}/posts/?${params}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`University posts failed: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error("Get university posts error:", error);
    throw error;
  }
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

// ============= DEFAULT EXPORT =============
export default {
  // Feed
  getFeed,
  testFeedConnection,
  
  // Posts
  getPostDetail,
  createPost,
  
  // Replies/Comments  
  getReplies,
  createReply,
  
  // Reactions
  likePost,
  removeLike,
  reactToReply,
  removeReplyReaction,
  likeReply,
  removeReplyLike,
  
  // Flag Voting
  flagVotePost,
  removeFlagVote,
  
  // Save/Unsave
  savePost,
  unsavePost,
  removeSavedPost, // backward compatibility
  getSavedPosts,
  
  // User Posts
  getUserPosts,
  
  // Helpers
  getPostInteractionType,
  reactToPost,
  
  // Search
  getHashtagPosts,
  getUniversityPosts,
  
  // Navigation
  openHashtag,
  openUniversity,
};