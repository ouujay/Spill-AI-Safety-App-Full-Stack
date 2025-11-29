// components/RepliesSection.js - Instagram-style replies with ranking
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { 
  getRepliesWithRanking, 
  createReplyOptimistic, 
  reactToReply, 
  removeReplyReaction 
} from '../api/api'; // FIXED: Import from main api file
import ReplyCard from './ReplyCard';

const REPLIES_PER_BATCH = 6;
const MY_REPLY_PIN_DURATION = 10 * 60 * 1000; // 10 minutes

const RepliesSection = ({ 
  post, 
  onReplyCountChange,
  currentUserId 
}) => {
  const { theme } = useTheme();
  
  // State management
  const [repliesState, setRepliesState] = useState({
    isExpanded: false,
    items: [],
    sortBy: 'top',
    hasMore: false,
    loading: false,
    totalCount: post.direct_replies_count || 0,
    offset: 0,
    myRecentReply: null,
    myReplyPinTime: null,
  });
  
  const [newReplyText, setNewReplyText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);

  // Animated values
  const expandAnimation = useMemo(() => new Animated.Value(0), []);

  // Check if my reply should still be pinned
  const shouldPinMyReply = useMemo(() => {
    if (!repliesState.myRecentReply || !repliesState.myReplyPinTime) return false;
    if (repliesState.sortBy !== 'top') return false;
    
    const timeSincePinned = Date.now() - repliesState.myReplyPinTime;
    return timeSincePinned < MY_REPLY_PIN_DURATION;
  }, [repliesState.myRecentReply, repliesState.myReplyPinTime, repliesState.sortBy]);

  // Computed replies list with pinning logic
  const displayReplies = useMemo(() => {
    let replies = [...repliesState.items];
    
    // If we should pin my reply and it's not already at the top
    if (shouldPinMyReply && repliesState.myRecentReply) {
      const myReplyIndex = replies.findIndex(r => r.id === repliesState.myRecentReply.id);
      if (myReplyIndex > 0) {
        // Remove from current position and add to top with pin flag
        replies.splice(myReplyIndex, 1);
        replies.unshift({ ...repliesState.myRecentReply, _isPinned: true });
      } else if (myReplyIndex === 0) {
        // Already at top, just add pin flag
        replies[0] = { ...replies[0], _isPinned: true };
      } else {
        // Not in list yet, add at top
        replies.unshift({ ...repliesState.myRecentReply, _isPinned: true });
      }
    }
    
    return replies;
  }, [repliesState.items, repliesState.myRecentReply, shouldPinMyReply]);

  // Load replies
  const loadReplies = useCallback(async (options = {}) => {
    const { 
      isRefresh = false, 
      newSort = null, 
      showLoading = true 
    } = options;
    
    if (showLoading) {
      setRepliesState(prev => ({ ...prev, loading: true }));
    }
    
    try {
      const sort = newSort || repliesState.sortBy;
      const offset = isRefresh ? 0 : repliesState.offset;
      
      const result = await getRepliesWithRanking(post.id, {
        sort,
        offset,
        pageSize: REPLIES_PER_BATCH
      });
      
      setRepliesState(prev => ({
        ...prev,
        items: isRefresh ? result.replies : [...prev.items, ...result.replies],
        hasMore: result.hasMore,
        totalCount: result.totalCount,
        offset: isRefresh ? result.replies.length : prev.offset + result.replies.length,
        sortBy: sort,
        loading: false,
        // Clear pinned reply if sorting changed
        myRecentReply: newSort && newSort !== prev.sortBy ? null : prev.myRecentReply,
        myReplyPinTime: newSort && newSort !== prev.sortBy ? null : prev.myReplyPinTime,
      }));
      
      // Update parent component about count change
      if (onReplyCountChange && result.totalCount !== repliesState.totalCount) {
        onReplyCountChange(result.totalCount);
      }
      
    } catch (error) {
      console.error('Failed to load replies:', error);
      setRepliesState(prev => ({ ...prev, loading: false }));
      Alert.alert('Error', 'Failed to load replies. Please try again.');
    }
  }, [post.id, repliesState.sortBy, repliesState.offset, repliesState.totalCount, onReplyCountChange]);

  // Expand/collapse replies
  const toggleExpanded = useCallback(async () => {
    if (!repliesState.isExpanded) {
      // Expanding - load first batch
      setRepliesState(prev => ({ ...prev, isExpanded: true }));
      
      Animated.timing(expandAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      if (repliesState.items.length === 0) {
        await loadReplies({ isRefresh: true });
      }
    } else {
      // Collapsing
      Animated.timing(expandAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setRepliesState(prev => ({ ...prev, isExpanded: false }));
        setShowReplyInput(false);
      });
    }
  }, [repliesState.isExpanded, repliesState.items.length, loadReplies, expandAnimation]);

  // Load more replies
  const loadMore = useCallback(() => {
    if (!repliesState.hasMore || repliesState.loading) return;
    loadReplies();
  }, [repliesState.hasMore, repliesState.loading, loadReplies]);

  // Change sort order
  const changeSortOrder = useCallback(async (newSort) => {
    if (newSort === repliesState.sortBy) return;
    
    await loadReplies({ 
      isRefresh: true, 
      newSort, 
      showLoading: true 
    });
  }, [repliesState.sortBy, loadReplies]);

  // Submit new reply
  const submitReply = useCallback(async () => {
    const content = newReplyText.trim();
    if (!content || isPosting) return;

    setIsPosting(true);
    
    // Create optimistic reply
    const optimisticReply = {
      id: `temp-${Date.now()}`,
      content,
      author: { 
        id: currentUserId,
        // Add current user data if available
      },
      created_at: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      user_reaction: null,
      replies_count: 0,
      is_mine: true,
      _isOptimistic: true,
      _isPinned: false,
    };

    try {
      // If collapsed, expand first
      if (!repliesState.isExpanded) {
        setRepliesState(prev => ({ ...prev, isExpanded: true }));
        Animated.timing(expandAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
      }

      // Add optimistic reply to state
      setRepliesState(prev => ({
        ...prev,
        items: [optimisticReply, ...prev.items],
        totalCount: prev.totalCount + 1,
        myRecentReply: optimisticReply,
        myReplyPinTime: Date.now(),
      }));

      // Clear input
      setNewReplyText('');
      setShowReplyInput(false);

      // Make API call
      const newReply = await createReplyOptimistic(post.id, content);

      // Replace optimistic reply with real reply
      setRepliesState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === optimisticReply.id ? { ...newReply, _isPinned: prev.sortBy === 'top' } : item
        ),
        myRecentReply: { ...newReply, _isPinned: prev.sortBy === 'top' },
      }));

      // Update parent count
      if (onReplyCountChange) {
        onReplyCountChange(repliesState.totalCount + 1);
      }

    } catch (error) {
      console.error('Failed to post reply:', error);
      
      // Remove optimistic reply on failure
      setRepliesState(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== optimisticReply.id),
        totalCount: Math.max(0, prev.totalCount - 1),
        myRecentReply: null,
        myReplyPinTime: null,
      }));
      
      Alert.alert('Error', 'Failed to post reply. Please try again.');
    } finally {
      setIsPosting(false);
    }
  }, [newReplyText, isPosting, currentUserId, repliesState.isExpanded, repliesState.totalCount, repliesState.sortBy, post.id, onReplyCountChange, expandAnimation]);

  // Handle reply reaction
  const handleReplyReaction = useCallback(async (replyId, type) => {
    try {
      const reply = displayReplies.find(r => r.id === replyId);
      if (!reply) return;

      // Optimistic update
      const updatedReply = { ...reply };
      
      if (type === 'up') {
        if (reply.user_reaction === 'up') {
          // Remove upvote
          updatedReply.upvotes = Math.max(0, reply.upvotes - 1);
          updatedReply.user_reaction = null;
        } else {
          // Add upvote (remove downvote if exists)
          if (reply.user_reaction === 'down') {
            updatedReply.downvotes = Math.max(0, reply.downvotes - 1);
          }
          updatedReply.upvotes = reply.upvotes + 1;
          updatedReply.user_reaction = 'up';
        }
      } else if (type === 'down') {
        if (reply.user_reaction === 'down') {
          // Remove downvote
          updatedReply.downvotes = Math.max(0, reply.downvotes - 1);
          updatedReply.user_reaction = null;
        } else {
          // Add downvote (remove upvote if exists)
          if (reply.user_reaction === 'up') {
            updatedReply.upvotes = Math.max(0, reply.upvotes - 1);
          }
          updatedReply.downvotes = reply.downvotes + 1;
          updatedReply.user_reaction = 'down';
        }
      }

      // Update state optimistically
      setRepliesState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === replyId ? updatedReply : item
        ),
        myRecentReply: prev.myRecentReply?.id === replyId ? updatedReply : prev.myRecentReply,
      }));

      // Make API call
      if (updatedReply.user_reaction) {
        await reactToReply(replyId, updatedReply.user_reaction);
      } else {
        await removeReplyReaction(replyId);
      }

    } catch (error) {
      console.error('Failed to react to reply:', error);
      // Could add rollback logic here
    }
  }, [displayReplies]);

  // Auto-collapse pin after duration
  useEffect(() => {
    if (shouldPinMyReply) {
      const timeRemaining = MY_REPLY_PIN_DURATION - (Date.now() - repliesState.myReplyPinTime);
      if (timeRemaining > 0) {
        const timeout = setTimeout(() => {
          setRepliesState(prev => ({
            ...prev,
            myRecentReply: null,
            myReplyPinTime: null,
          }));
        }, timeRemaining);
        
        return () => clearTimeout(timeout);
      }
    }
  }, [shouldPinMyReply, repliesState.myReplyPinTime]);

  // Render reply item
  const renderReply = useCallback(({ item }) => (
    <ReplyCard
      reply={item}
      onReaction={handleReplyReaction}
      showPinnedBadge={item._isPinned}
      isOptimistic={item._isOptimistic}
    />
  ), [handleReplyReaction]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  return (
    <View style={styles.container}>
      {/* Toggle Button */}
      <TouchableOpacity
        style={[styles.toggleButton, { borderColor: theme.colors.border }]}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={repliesState.isExpanded ? "chevron-up" : "chatbubble-outline"} 
          size={16} 
          color={theme.colors.accent} 
        />
        <Text style={[styles.toggleText, { color: theme.colors.accent }]}>
          {repliesState.isExpanded 
            ? "Hide replies" 
            : `View replies (${repliesState.totalCount})`
          }
        </Text>
      </TouchableOpacity>

      {/* Expanded Replies */}
      <Animated.View
        style={[
          styles.repliesContainer,
          {
            maxHeight: expandAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1000],
            }),
            opacity: expandAnimation,
          },
        ]}
      >
        {repliesState.isExpanded && (
          <View>
            {/* Sort Toggle */}
            <View style={styles.sortContainer}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  repliesState.sortBy === 'top' && { backgroundColor: theme.colors.accent },
                ]}
                onPress={() => changeSortOrder('top')}
              >
                <Text style={[
                  styles.sortText,
                  { color: repliesState.sortBy === 'top' ? '#fff' : theme.colors.text }
                ]}>
                  Top
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  repliesState.sortBy === 'new' && { backgroundColor: theme.colors.accent },
                ]}
                onPress={() => changeSortOrder('new')}
              >
                <Text style={[
                  styles.sortText,
                  { color: repliesState.sortBy === 'new' ? '#fff' : theme.colors.text }
                ]}>
                  New
                </Text>
              </TouchableOpacity>
            </View>

            {/* Replies List */}
            <FlatList
              data={displayReplies}
              renderItem={renderReply}
              keyExtractor={keyExtractor}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            {/* Load More Button */}
            {repliesState.hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}
                disabled={repliesState.loading}
              >
                {repliesState.loading ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <>
                    <Ionicons name="add" size={16} color={theme.colors.accent} />
                    <Text style={[styles.loadMoreText, { color: theme.colors.accent }]}>
                      View more replies ({repliesState.hasMore ? repliesState.totalCount - repliesState.offset : 0})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Reply Input */}
            {showReplyInput ? (
              <View style={[styles.replyInputContainer, { borderColor: theme.colors.border }]}>
                <TextInput
                  style={[styles.replyInput, { color: theme.colors.text }]}
                  placeholder="Write a reply..."
                  placeholderTextColor={theme.colors.secondary}
                  value={newReplyText}
                  onChangeText={setNewReplyText}
                  multiline
                  autoFocus
                />
                <View style={styles.replyActions}>
                  <TouchableOpacity
                    style={styles.replyCancel}
                    onPress={() => {
                      setShowReplyInput(false);
                      setNewReplyText('');
                    }}
                  >
                    <Text style={[styles.replyCancelText, { color: theme.colors.secondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.replySubmit,
                      { backgroundColor: newReplyText.trim() ? theme.colors.accent : theme.colors.border }
                    ]}
                    onPress={submitReply}
                    disabled={!newReplyText.trim() || isPosting}
                  >
                    {isPosting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.replySubmitText}>Post</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addReplyButton}
                onPress={() => setShowReplyInput(true)}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.accent} />
                <Text style={[styles.addReplyText, { color: theme.colors.accent }]}>
                  Add a reply
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  repliesContainer: {
    overflow: 'hidden',
  },
  sortContainer: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    height: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  replyInputContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  replyInput: {
    fontSize: 16,
    minHeight: 40,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  replyCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyCancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  replySubmit: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySubmitText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addReplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 8,
  },
  addReplyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RepliesSection;