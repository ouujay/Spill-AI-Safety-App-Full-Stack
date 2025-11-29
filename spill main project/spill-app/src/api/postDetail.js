// api/postDetail.js - Post detail and comments API functions
import api from "./api"; // Uses your existing posts API instance

// Get post detail with basic reply count
export const getPostDetail = (postId) =>
  api.get(`/posts/${postId}/`).then(r => r.data);

// Get replies/comments for a post (paginated)
export const getPostReplies = (postId, page = 1, pageSize = 20) =>
  api.get(`/posts/${postId}/replies/`, { 
    params: { page, page_size: pageSize } 
  }).then(r => r.data);

// Create a reply/comment
export const createReply = ({ postId, content, parent = null }) =>
  api.post(`/create/`, {
    content,
    parent: parent || postId, // Reply to post or another reply
    thread: postId, // Always part of the main post's thread
  }).then(r => r.data);

// React to a reply (same as posts)
export const reactToReply = (replyId, reaction) =>
  api.post(`/react/${replyId}/`, { reaction }).then(r => r.data);

// Remove reaction from reply
export const removeReplyReaction = (replyId) =>
  api.delete(`/react/${replyId}/remove/`).then(r => r.data);