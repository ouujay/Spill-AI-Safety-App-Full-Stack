// screens/PostDetailScreen.js - COMPLETE FIXED VERSION
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistanceToNow } from 'date-fns';

// FIXED: Import correct API functions
import { 
  getPostDetail, 
  getReplies,
  createReply,
  reactToPost,
  reactToReply,
  savePost,           
  unsavePost,         // FIXED: Use unsavePost instead of removeSavedPost
  getPostInteractionType,
} from "../api/posts";

const { width, height } = Dimensions.get("window");

export default function PostDetailScreen({ route, navigation }) {
  const { postId, post: initialPost } = route.params;
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Post state
  const [post, setPost] = useState(initialPost || null);
  const [loading, setLoading] = useState(!initialPost);
  
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentSort, setCommentSort] = useState('top'); // FIXED: Default to 'top'
  
  // Nested replies state
  const [expandedReplies, setExpandedReplies] = useState(new Set());
  const [replyStates, setReplyStates] = useState({});
  
  // Comment input state
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Reply to comment state
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Load post details
  const fetchPost = useCallback(async () => {
    try {
      setLoading(true);
      const postData = await getPostDetail(postId);
      setPost(postData);
      
      // Auto-load comments if there are any
      if (postData.replies_count > 0) {
        loadComments(true);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      Alert.alert('Error', 'Failed to load post details');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  // Load comments with sorting
  const loadComments = useCallback(async (reset = false, sort = commentSort) => {
    if (!post) return;
    
    try {
      setCommentsLoading(true);
      const page = reset ? 1 : commentsPage;
      
      const response = await getReplies(post.id, { 
        page, 
        page_size: 20,
        sort 
      });
      
      const newComments = response.results || response.items || [];
      
      if (reset) {
        setComments(newComments);
        setCommentsPage(2);
      } else {
        setComments(prev => [...prev, ...newComments]);
        setCommentsPage(prev => prev + 1);
      }
      
      setHasMoreComments(!!response.next || (response.has_more ?? false));
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  }, [post, commentsPage, commentSort]);

  // Handle comment sort change
  const handleCommentSortChange = useCallback((newSort) => {
    if (newSort !== commentSort) {
      setCommentSort(newSort);
      loadComments(true, newSort);
    }
  }, [commentSort, loadComments]);

  // Submit new comment
  const submitComment = useCallback(async () => {
    const content = newComment.trim();
    
    if (!content) {
      Alert.alert('Error', 'Comment cannot be empty.');
      return;
    }
    
    if (posting || !post) return;

    setPosting(true);
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    
    const optimisticComment = {
      id: tempId,
      content,
      author: { 
        name: 'You',
        id: 'current-user'
      },
      created_at: new Date().toISOString(),
      _isOptimistic: true,
      upvotes: 0,
      downvotes: 0,
      user_reaction: null,
      first_name: 'You',
      replies_count: 0,
    };

    try {
      setComments(prev => [optimisticComment, ...prev]);
      setNewComment('');
      
      const newCommentData = await createReply(post.id, content);
      
      setComments(prev => 
        prev.map(comment => 
          comment.id === tempId ? newCommentData : comment
        )
      );
      
      setPost(prev => ({
        ...prev,
        replies_count: (prev.replies_count || 0) + 1
      }));

    } catch (error) {
      console.error('Error posting comment:', error);
      
      setComments(prev => 
        prev.filter(comment => comment.id !== tempId)
      );
      
      let errorMessage = "Failed to post comment. Please try again.";
      if (error.message.includes("empty")) {
        errorMessage = "Comment cannot be empty.";
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setPosting(false);
    }
  }, [newComment, posting, post]);

  // FIXED: Handle reply to comment with proper count updates
  const handleReplyToComment = useCallback(async (commentId, content) => {
    if (!content.trim()) return;
    
    try {
      const tempId = `temp-reply-${Date.now()}-${Math.random()}`;
      const parentComment = comments.find(c => c.id === commentId);
      
      if (!parentComment) return;
      
      const optimisticReply = {
        id: tempId,
        content: content.trim(),
        author: { name: 'You', id: 'current-user' },
        created_at: new Date().toISOString(),
        _isOptimistic: true,
        upvotes: 0,
        user_reaction: null,
        parent: commentId,
      };

      // FIXED: Always update the parent comment's replies_count first
      const currentRepliesCount = parentComment.replies_count || 0;
      const newRepliesCount = currentRepliesCount + 1;
      
      // Update parent comment reply count immediately
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, replies_count: newRepliesCount }
          : comment
      ));

      // Add to nested replies if expanded
      if (expandedReplies.has(commentId)) {
        setReplyStates(prev => ({
          ...prev,
          [commentId]: {
            ...prev[commentId],
            items: [optimisticReply, ...(prev[commentId]?.items || [])],
            hasMore: prev[commentId]?.hasMore || false,
            page: prev[commentId]?.page || 2,
            loading: false,
            sortBy: 'new',
          }
        }));
      } else {
        // Even if not expanded, initialize the reply state so we know there are replies
        setReplyStates(prev => ({
          ...prev,
          [commentId]: {
            items: [optimisticReply],
            hasMore: false,
            page: 2,
            loading: false,
            sortBy: 'new',
          }
        }));
      }

      try {
        const newReply = await createReply(post.id, { 
          content: content.trim(), 
          parent: commentId 
        });
        
        // Replace optimistic reply with real one
        setReplyStates(prev => ({
          ...prev,
          [commentId]: {
            ...prev[commentId],
            items: prev[commentId]?.items.map(item => 
              item.id === tempId ? newReply : item
            ) || [newReply],
          }
        }));
        
      } catch (error) {
        console.error('Error posting reply:', error);
        
        // Revert the reply count on error
        setComments(prev => prev.map(comment => 
          comment.id === commentId 
            ? { ...comment, replies_count: currentRepliesCount }
            : comment
        ));
        
        // Remove optimistic reply
        setReplyStates(prev => ({
          ...prev,
          [commentId]: {
            ...prev[commentId],
            items: prev[commentId]?.items.filter(item => item.id !== tempId) || [],
          }
        }));
        
        Alert.alert('Error', 'Failed to post reply');
      }

    } catch (error) {
      console.error('Error in handleReplyToComment:', error);
      Alert.alert('Error', 'Failed to post reply');
    }
  }, [comments, post, expandedReplies]);

  // Toggle replies for a comment
  const toggleReplies = useCallback(async (commentId) => {
    const isExpanded = expandedReplies.has(commentId);
    
    if (isExpanded) {
      // Collapse
      setExpandedReplies(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
    } else {
      // Expand and load replies if not loaded
      setExpandedReplies(prev => new Set(prev).add(commentId));
      
      if (!replyStates[commentId]) {
        try {
          const response = await getReplies(commentId, { 
            page: 1, 
            page_size: 10,
            sort: 'top' // FIXED: Use 'top' as default sort for nested replies too
          });
          
          setReplyStates(prev => ({
            ...prev,
            [commentId]: {
              items: response.results || response.items || [],
              hasMore: !!response.next,
              page: 2,
              loading: false,
              sortBy: 'new',
            }
          }));
        } catch (error) {
          console.error('Error loading replies:', error);
        }
      }
    }
  }, [expandedReplies, replyStates]);

  // Handle reactions based on post type
  const handleReaction = useCallback(async (reactionType) => {
    if (!post) return;
    
    try {
      const interactionType = getPostInteractionType(post);
      const originalPost = { ...post };
      
      // Optimistic update
      if (interactionType === 'tea' && reactionType === 'like') {
        const wasLiked = post.user_reaction === "up";
        setPost(prev => ({
          ...prev,
          user_reaction: wasLiked ? null : "up",
          likes: wasLiked ? Math.max(0, (prev.likes || 0) - 1) : (prev.likes || 0) + 1
        }));
      } else if (interactionType === 'flag' && ['red', 'green'].includes(reactionType)) {
        const currentVote = post.user_flag_vote;
        const newVote = currentVote === reactionType ? null : reactionType;
        
        setPost(prev => {
          const updated = { ...prev, user_flag_vote: newVote };
          
          if (currentVote === 'red') updated.red_votes = Math.max(0, (prev.red_votes || 0) - 1);
          if (currentVote === 'green') updated.green_votes = Math.max(0, (prev.green_votes || 0) - 1);
          
          if (newVote === 'red') updated.red_votes = (updated.red_votes || 0) + 1;
          if (newVote === 'green') updated.green_votes = (updated.green_votes || 0) + 1;
          
          return updated;
        });
      }

      await reactToPost(post.id, post, reactionType);
      
    } catch (error) {
      console.error('Error with reaction:', error);
      setPost(originalPost);
      Alert.alert('Error', 'Failed to update reaction. Please try again.');
    }
  }, [post]);

  // FIXED: Handle comment reactions with better state management
  const handleCommentReaction = useCallback(async (commentId, reactionType) => {
    try {
      // Find the comment first to get current state
      let targetComment = null;
      let isMainComment = false;
      
      // Check if it's a main comment
      targetComment = comments.find(c => c.id === commentId);
      if (targetComment) {
        isMainComment = true;
      } else {
        // Check nested replies
        for (const [parentId, state] of Object.entries(replyStates)) {
          const foundReply = state.items?.find(item => item.id === commentId);
          if (foundReply) {
            targetComment = foundReply;
            isMainComment = false;
            break;
          }
        }
      }
      
      if (!targetComment) {
        console.error('Comment not found for reaction:', commentId);
        return;
      }
      
      const wasLiked = targetComment.user_reaction === 'up';
      const newReaction = wasLiked ? null : 'up';
      const currentUpvotes = targetComment.upvotes || 0;
      const newUpvotes = wasLiked ? Math.max(0, currentUpvotes - 1) : currentUpvotes + 1;
      
      // Optimistic update
      if (isMainComment) {
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              user_reaction: newReaction,
              upvotes: newUpvotes
            };
          }
          return comment;
        }));
      } else {
        // Handle nested reply reactions
        setReplyStates(prev => {
          const newStates = { ...prev };
          for (const [parentId, state] of Object.entries(newStates)) {
            if (state.items?.some(item => item.id === commentId)) {
              newStates[parentId] = {
                ...state,
                items: state.items.map(item => {
                  if (item.id === commentId) {
                    return {
                      ...item,
                      user_reaction: newReaction,
                      upvotes: newUpvotes
                    };
                  }
                  return item;
                })
              };
              break;
            }
          }
          return newStates;
        });
      }
      
      // Make API call
      await reactToReply(commentId, reactionType);
      
    } catch (error) {
      console.error('Error reacting to comment:', error);
      
      // Revert optimistic update on error
      if (isMainComment) {
        setComments(prev => prev.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              user_reaction: targetComment.user_reaction,
              upvotes: targetComment.upvotes
            };
          }
          return comment;
        }));
      } else {
        setReplyStates(prev => {
          const newStates = { ...prev };
          for (const [parentId, state] of Object.entries(newStates)) {
            if (state.items?.some(item => item.id === commentId)) {
              newStates[parentId] = {
                ...state,
                items: state.items.map(item => {
                  if (item.id === commentId) {
                    return {
                      ...item,
                      user_reaction: targetComment.user_reaction,
                      upvotes: targetComment.upvotes
                    };
                  }
                  return item;
                })
              };
              break;
            }
          }
          return newStates;
        });
      }
      
      Alert.alert('Error', 'Failed to react to comment');
    }
  }, [comments, replyStates]);

  // FIXED: Handle save/unsave
  const handleSave = useCallback(async () => {
    if (!post) return;
    
    try {
      const wasSaved = post.is_saved || post.saved; // Handle both field names
      
      // Optimistic update
      setPost(prev => ({ ...prev, is_saved: !wasSaved, saved: !wasSaved }));

      if (wasSaved) {
        await unsavePost(post.id); // FIXED: Use unsavePost instead of removeSavedPost
      } else {
        await savePost(post.id);
      }
    } catch (error) {
      console.error('Error saving post:', error);
      // Revert optimistic update on error
      setPost(prev => ({ ...prev, is_saved: wasSaved, saved: wasSaved }));
      Alert.alert('Error', 'Failed to save post. Please try again.');
    }
  }, [post]);

  // Refresh everything
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPost();
      await loadComments(true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPost, loadComments]);

  // Initialize
  useEffect(() => {
    // ALWAYS fetch complete post data to ensure all interactions are loaded
    fetchPost();
    
    // Note: fetchPost will also auto-load comments if replies_count > 0
  }, [fetchPost]);

  // Get post type info
  const getPostTypeInfo = () => {
    if (post?.flag === "red") return { emoji: "🚩", label: "Red Flag", color: "#ef4444" };
    if (post?.flag === "green") return { emoji: "💚", label: "Green Flag", color: "#22c55e" };
    return { emoji: "🫖", label: "Tea", color: theme.colors.secondary };
  };

  // Safe image helper
  const safeImageUri = (src) => {
    if (!src) return null;
    const s = String(src).trim();
    if (/^https?:\/\//i.test(s)) return s;
    return src;
  };

  // Render nested reply item
  const renderNestedReply = ({ item: reply, parentId }) => (
    <View style={[styles.nestedReply, { backgroundColor: theme.colors.primary + '10' }]}>
      <View style={styles.commentHeader}>
        <View style={[styles.commentAvatar, { backgroundColor: theme.colors.border, width: 28, height: 28 }]}>
          <Text style={[styles.commentAvatarText, { fontSize: 12 }]}>
            {reply.author?.name?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        
        <View style={styles.commentInfo}>
          <Text style={[styles.commentAuthor, { color: theme.colors.text, fontSize: 13 }]}>
            {reply.author?.name || reply.first_name || 'Unknown'}
            {reply._isOptimistic && (
              <Text style={[styles.youBadge, { color: theme.colors.accent }]}> • You</Text>
            )}
          </Text>
          <Text style={[styles.commentTime, { color: theme.colors.secondary, fontSize: 11 }]}>
            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
            {reply._isOptimistic && ' • Posting...'}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.commentContent, { color: theme.colors.text, fontSize: 14 }]}>
        {reply.content}
      </Text>
      
      {/* Nested reply actions */}
      <View style={styles.commentActions}>
        <TouchableOpacity 
          style={styles.commentActionButton}
          onPress={() => handleCommentReaction(reply.id, 'up')}
        >
          <Ionicons 
            name={reply.user_reaction === 'up' ? "heart" : "heart-outline"} 
            size={14} 
            color={reply.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary} 
          />
          <Text style={[
            styles.commentActionText, 
            { color: reply.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary }
          ]}>
            {reply.upvotes || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render comment item with threading
  const renderComment = ({ item: comment }) => {
    const hasReplies = (comment.replies_count || 0) > 0;
    const isExpanded = expandedReplies.has(comment.id);
    const nestedReplies = replyStates[comment.id]?.items || [];
    
    return (
      <View style={[styles.comment, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.commentHeader}>
          <View style={[styles.commentAvatar, { backgroundColor: theme.colors.border }]}>
            <Text style={[styles.commentAvatarText, { color: theme.colors.text }]}>
              {comment.author?.name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          
          <View style={styles.commentInfo}>
            <Text style={[styles.commentAuthor, { color: theme.colors.text }]}>
              {comment.author?.name || comment.first_name || 'Unknown'}
              {comment._isOptimistic && (
                <Text style={[styles.youBadge, { color: theme.colors.accent }]}> • You</Text>
              )}
            </Text>
            <Text style={[styles.commentTime, { color: theme.colors.secondary }]}>
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              {comment._isOptimistic && ' • Posting...'}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.commentContent, { color: theme.colors.text }]}>
          {comment.content}
        </Text>
        
        {/* Comment actions with inline counts */}
        <View style={styles.commentActions}>
          <TouchableOpacity 
            style={styles.commentActionButton}
            onPress={() => handleCommentReaction(comment.id, 'up')}
          >
            <Ionicons 
              name={comment.user_reaction === 'up' ? "heart" : "heart-outline"} 
              size={16} 
              color={comment.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary} 
            />
            <Text style={[
              styles.commentActionText, 
              { color: comment.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary }
            ]}>
              {comment.upvotes || 0}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.commentActionButton}
            onPress={() => {
              setReplyingTo(comment.id);
            }}
          >
            <Ionicons name="chatbubble-outline" size={16} color={theme.colors.secondary} />
            <Text style={[styles.commentActionText, { color: theme.colors.secondary }]}>
              Reply
            </Text>
          </TouchableOpacity>
          
          {/* Toggle replies button */}
          {hasReplies && (
            <TouchableOpacity 
              style={styles.commentActionButton}
              onPress={() => toggleReplies(comment.id)}
            >
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={theme.colors.secondary} 
              />
              <Text style={[styles.commentActionText, { color: theme.colors.secondary }]}>
                {isExpanded ? 'Hide' : 'View'} {comment.replies_count} {comment.replies_count === 1 ? 'reply' : 'replies'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Reply input for this comment */}
        {replyingTo === comment.id && (
          <View style={[
            styles.replyInputContainer, 
            { 
              borderColor: theme.colors.accent, // FIXED: Purple border when active
              borderWidth: 2, // FIXED: Thicker border for visibility
              backgroundColor: theme.colors.accent + '10', // FIXED: Light purple background
            }
          ]}>
            <TextInput
              ref={(ref) => {
                // FIXED: Auto-focus when this reply input becomes active
                if (replyingTo === comment.id && ref) {
                  setTimeout(() => ref.focus(), 100);
                }
              }}
              style={[
                styles.replyInput, 
                { 
                  color: theme.colors.text, 
                  borderColor: theme.colors.accent, // FIXED: Purple border for input
                  backgroundColor: theme.colors.background
                }
              ]}
              placeholder={`Reply to ${comment.author?.name || 'comment'}...`}
              placeholderTextColor={theme.colors.secondary}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              autoFocus={true} // FIXED: Force autofocus
            />
            <View style={styles.replyInputActions}>
              <TouchableOpacity
                style={[styles.replyButton, { backgroundColor: theme.colors.border }]}
                onPress={() => {
                  setReplyingTo(null);
                  setReplyText('');
                }}
              >
                <Text style={[styles.replyButtonText, { color: theme.colors.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.replyButton, 
                  { backgroundColor: replyText.trim() ? theme.colors.accent : theme.colors.border }
                ]}
                onPress={async () => {
                  if (replyText.trim()) {
                    await handleReplyToComment(comment.id, replyText);
                    setReplyingTo(null);
                    setReplyText('');
                  }
                }}
                disabled={!replyText.trim()}
              >
                <Text style={[
                  styles.replyButtonText, 
                  { color: replyText.trim() ? '#fff' : theme.colors.secondary }
                ]}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Nested replies */}
        {isExpanded && nestedReplies.length > 0 && (
          <View style={styles.nestedRepliesContainer}>
            {nestedReplies.map((reply) => (
              <View key={reply.id}>
                {renderNestedReply({ item: reply, parentId: comment.id })}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (loading && !post) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Loading post...
        </Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          Post not found
        </Text>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.colors.accent }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const postType = getPostTypeInfo();
  const imageUri = safeImageUri(post?.image_url || post?.image || post?.image_src);
  const interactionType = getPostInteractionType(post);
  const isTeaPost = interactionType === 'tea';
  const isFlagPost = interactionType === 'flag';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
      
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          paddingTop: insets.top 
        }
      ]}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Post
        </Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleSave}
        >
          <Ionicons 
            name={(post.is_saved || post.saved) ? "bookmark" : "bookmark-outline"} 
            size={24} 
            color={(post.is_saved || post.saved) ? theme.colors.accent : theme.colors.text} 
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <FlatList
          data={comments}
          keyExtractor={(item, index) => item.id ? `${item.id}-${index}` : `comment-${index}`}
          renderItem={renderComment}
          ListHeaderComponent={() => (
            <View style={[styles.postContainer, { backgroundColor: theme.colors.surface }]}>
              {/* Post Header */}
              <View style={styles.postHeader}>
                <View style={styles.postInfo}>
                  <Text style={[styles.postTitle, { color: theme.colors.text }]}>
                    {postType.emoji} {post.first_name}
                    {post.person_age && (
                      <Text style={[styles.postAge, { color: theme.colors.secondary }]}>
                        {` (${post.person_age})`}
                      </Text>
                    )}
                  </Text>
                  <View style={styles.postMeta}>
                    <Text style={[styles.postAuthor, { color: theme.colors.secondary }]}>
                      @{post.author?.name || 'user'}
                    </Text>
                    <Text style={[styles.dot, { color: theme.colors.secondary }]}> • </Text>
                    <Text style={[styles.postUniversity, { color: theme.colors.accent }]}>
                      {post.university?.name || post.university || 'University'}
                    </Text>
                    <Text style={[styles.dot, { color: theme.colors.secondary }]}> • </Text>
                    <Text style={[styles.postTime, { color: theme.colors.secondary }]}>
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.flagBadge, { backgroundColor: postType.color + '20' }]}>
                  <Text style={[styles.flagText, { color: postType.color }]}>
                    {postType.label}
                  </Text>
                </View>
              </View>

              {/* Post Content */}
              {post.content && (
                <Text style={[styles.postContent, { color: theme.colors.text }]}>
                  {post.content}
                </Text>
              )}

              {/* Post Image */}
              {imageUri && (
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.postImage}
                  resizeMode="cover"
                />
              )}

              {/* Action Buttons */}
              <View style={styles.actionBar}>
                {isTeaPost ? (
                  // Tea Post: Like button with inline count
                  <TouchableOpacity 
                    style={[
                      styles.actionButton, 
                      post.user_reaction === "up" && { backgroundColor: theme.colors.accent + '15' }
                    ]}
                    onPress={() => handleReaction('like')}
                  >
                    <Ionicons 
                      name={post.user_reaction === "up" ? "heart" : "heart-outline"} 
                      size={20} 
                      color={post.user_reaction === "up" ? theme.colors.accent : theme.colors.secondary} 
                    />
                    <Text style={[
                      styles.actionText, 
                      { color: post.user_reaction === "up" ? theme.colors.accent : theme.colors.secondary }
                    ]}>
                      {post.likes || 0}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  // Flag Post: Red/Green buttons with inline counts
                  <View style={styles.flagActions}>
                    <TouchableOpacity 
                      style={[
                        styles.flagButton, 
                        { backgroundColor: "#ef444415" },
                        post.user_flag_vote === "red" && { borderWidth: 2, borderColor: "#ef4444" }
                      ]}
                      onPress={() => handleReaction('red')}
                    >
                      <Ionicons 
                        name="flag" 
                        size={18} 
                        color={post.user_flag_vote === "red" ? "#ef4444" : "#ef4444AA"} 
                      />
                      <Text style={[
                        styles.flagButtonText, 
                        { color: post.user_flag_vote === "red" ? "#ef4444" : "#ef4444AA" }
                      ]}>
                        {post.red_votes || 0}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.flagButton, 
                        { backgroundColor: "#22c55e15" },
                        post.user_flag_vote === "green" && { borderWidth: 2, borderColor: "#22c55e" }
                      ]}
                      onPress={() => handleReaction('green')}
                    >
                      <Ionicons 
                        name="flag" 
                        size={18} 
                        color={post.user_flag_vote === "green" ? "#22c55e" : "#22c55eAA"} 
                      />
                      <Text style={[
                        styles.flagButtonText, 
                        { color: post.user_flag_vote === "green" ? "#22c55e" : "#22c55eAA" }
                      ]}>
                        {post.green_votes || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Comments count - simplified */}
                <View style={styles.commentCountContainer}>
                  <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.secondary} />
                  <Text style={[styles.commentCountText, { color: theme.colors.secondary }]}>
                    {post.replies_count || 0}
                  </Text>
                </View>
              </View>

              {/* Comments Section Header with Sort */}
              {(post.replies_count > 0 || comments.length > 0) && (
                <View style={[styles.commentsHeader, { borderTopColor: theme.colors.border }]}>
                  <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
                    Comments
                  </Text>
                  
                  {/* Sort options */}
                  <View style={styles.sortContainer}>
                    <TouchableOpacity
                      style={[
                        styles.sortButton,
                        commentSort === 'new' && { backgroundColor: theme.colors.accent }
                      ]}
                      onPress={() => handleCommentSortChange('new')}
                    >
                      <Text style={[
                        styles.sortText,
                        { color: commentSort === 'new' ? '#fff' : theme.colors.secondary }
                      ]}>
                        New
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.sortButton,
                        commentSort === 'top' && { backgroundColor: theme.colors.accent }
                      ]}
                      onPress={() => handleCommentSortChange('top')}
                    >
                      <Text style={[
                        styles.sortText,
                        { color: commentSort === 'top' ? '#fff' : theme.colors.secondary }
                      ]}>
                        Top
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
          ListFooterComponent={() => (
            hasMoreComments && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => loadComments(false)}
                disabled={commentsLoading}
              >
                {commentsLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <>
                    <Ionicons name="add" size={16} color={theme.colors.accent} />
                    <Text style={[styles.loadMoreText, { color: theme.colors.accent }]}>
                      Load more comments
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
          style={styles.flatList}
          showsVerticalScrollIndicator={false}
        />

        {/* Main Comment Input - FIXED: Only focus when not replying to specific comment */}
        <View style={[
          styles.commentInputContainer, 
          { 
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: insets.bottom 
          }
        ]}>
          <View style={styles.commentInputRow}>
            <TextInput
              ref={(ref) => {
                // FIXED: Don't auto-focus main input when replying to comment
                if (!replyingTo && ref) {
                  // Only focus main input if not replying to a specific comment
                }
              }}
              style={[
                styles.commentInput,
                { 
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background
                }
              ]}
              placeholder="Write a comment..."
              placeholderTextColor={theme.colors.secondary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              onFocus={() => {
                // FIXED: Clear any active reply state when focusing main input
                if (replyingTo) {
                  setReplyingTo(null);
                  setReplyText('');
                }
              }}
            />
            
            <TouchableOpacity
              style={[
                styles.sendButton,
                { 
                  backgroundColor: newComment.trim() ? theme.colors.accent : theme.colors.border,
                  opacity: posting ? 0.5 : 1
                }
              ]}
              onPress={submitComment}
              disabled={!newComment.trim() || posting}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={newComment.trim() ? "#fff" : theme.colors.secondary} 
                />
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.helperText, { color: theme.colors.secondary }]}>
            {newComment.length}/500 characters
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  centered: { 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  loadingText: { 
    marginTop: 16, 
    fontSize: 16 
  },
  errorText: { 
    fontSize: 18, 
    marginBottom: 20 
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: { 
    padding: 8 
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },

  keyboardContainer: { 
    flex: 1 
  },
  flatList: { 
    flex: 1 
  },
  
  postContainer: { 
    padding: 16, 
    marginBottom: 8 
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  postInfo: { 
    flex: 1 
  },
  postTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  postAge: { 
    fontSize: 18, 
    fontWeight: '500' 
  },
  postMeta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flexWrap: 'wrap' 
  },
  postAuthor: { 
    fontSize: 14 
  },
  postUniversity: { 
    fontSize: 14, 
    fontWeight: '600' 
  },
  postTime: { 
    fontSize: 14 
  },
  dot: { 
    fontSize: 14 
  },
  flagBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  flagText: { 
    fontSize: 12, 
    fontWeight: '600' 
  },

  postContent: { 
    fontSize: 16, 
    lineHeight: 24, 
    marginBottom: 16 
  },
  postImage: { 
    width: '100%', 
    height: 250, 
    borderRadius: 12, 
    marginBottom: 16 
  },

  actionBar: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  actionText: { 
    fontSize: 16, 
    fontWeight: '600' 
  },

  flagActions: { 
    flexDirection: 'row', 
    gap: 12
  },
  flagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    minWidth: 80,
  },
  flagButtonText: { 
    fontSize: 16, 
    fontWeight: '600' 
  },

  commentCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCountText: {
    fontSize: 16,
    fontWeight: '600',
  },

  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    marginTop: 16,
    borderTopWidth: 1,
  },
  commentsTitle: { 
    fontSize: 18, 
    fontWeight: '600'
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600',
  },

  comment: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentAvatarText: { 
    fontSize: 16, 
    fontWeight: '600' 
  },
  commentInfo: { 
    flex: 1 
  },
  commentAuthor: { 
    fontSize: 15, 
    fontWeight: '600' 
  },
  commentTime: { 
    fontSize: 12, 
    marginTop: 2 
  },
  youBadge: { 
    fontSize: 12, 
    fontWeight: '500' 
  },
  commentContent: { 
    fontSize: 15, 
    lineHeight: 22,
    marginBottom: 12,
  },

  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  commentActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  commentActionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  replyInputContainer: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1, // Default border
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
    shadowColor: "#000", // FIXED: Add shadow for better visibility
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // For Android shadow
  },
  replyInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
    maxHeight: 80,
  },
  replyInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  replyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  replyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  nestedRepliesContainer: {
    marginTop: 12,
    marginLeft: 20,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  nestedReply: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },

  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    gap: 8,
  },
  loadMoreText: { 
    fontSize: 14, 
    fontWeight: '600' 
  },

  commentInputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  helperText: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});