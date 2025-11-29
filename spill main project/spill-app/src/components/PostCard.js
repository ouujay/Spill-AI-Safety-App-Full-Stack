// components/PostCard.js - UPDATED with person details and flag voting system
import React, { memo, useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image,
  StyleSheet, 
  Animated,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { formatDistanceToNow } from 'date-fns';
import { voteOnPoll } from '../api/api'; // Import poll voting function

// Safe image URI helper
const safeImageUri = (src) => {
  if (!src) return null;
  const s = String(src).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return src;
};

const PostCard = memo(({ 
  post, 
  onReaction, // For Tea posts (like/unlike)
  onFlagVote, // For Red/Green flag posts
  onSave,
  onRepost,
  onAvatarPress,
  onUniversityPress,
  onPress,
  onComment,
  onShare,
  showSeenIndicator = false,
  isViewing = false,
  onPollVote // Poll vote handler
}) => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  // Local state for interactions and animations
  const [localViewCount, setLocalViewCount] = useState(post?.views || 0);
  const [localPoll, setLocalPoll] = useState(post?.poll || null);
  const [userReaction, setUserReaction] = useState(post?.user_reaction);
  const [userFlagVote, setUserFlagVote] = useState(post?.user_flag_vote);
  const [localCounts, setLocalCounts] = useState({
    likes: post?.likes || 0,
    red_votes: post?.red_votes || 0,
    green_votes: post?.green_votes || 0,
    replies: post?.replies_count || 0,
  });
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Determine interaction mode
  const isTeaPost = post?.interaction_mode === "like_only" || (!post?.flag);
  const isFlagPost = post?.interaction_mode === "flag_vote" || (post?.flag && post.flag !== null);

  // Update view count when viewed
  useEffect(() => {
    if (isViewing && !showSeenIndicator) {
      setLocalViewCount(prev => prev + 1);
      
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isViewing, showSeenIndicator, fadeAnim]);

  // Update local states when post data changes
  useEffect(() => {
    setLocalViewCount(post?.views || 0);
    setLocalPoll(post?.poll || null);
    setUserReaction(post?.user_reaction);
    setUserFlagVote(post?.user_flag_vote);
    setLocalCounts({
      likes: post?.likes || 0,
      red_votes: post?.red_votes || 0,
      green_votes: post?.green_votes || 0,
      replies: post?.replies_count || 0,
    });
  }, [post]);

  // Navigation handlers
  const handlePostPress = useCallback(() => {
    if (onPress) {
      onPress(post);
    } else {
      navigation.navigate('PostDetail', { 
        postId: post.id, 
        initialPost: post 
      });
    }
  }, [navigation, post, onPress]);

  const handleHashtagPress = useCallback((hashtag) => {
    const cleanName = (hashtag?.name || hashtag).toString().replace(/^#/, "").trim();
    if (!cleanName) return;
    
    navigation.navigate("ExploreList", { 
      type: "hashtag", 
      id: cleanName,
      title: `#${cleanName}` 
    });
  }, [navigation]);

  const handleUniversityPress = useCallback((university) => {
    if (onUniversityPress) {
      onUniversityPress(university);
    } else if (university?.id) {
      navigation.navigate("ExploreList", { 
        type: "university", 
        id: university.id,
        title: university.name || `University ${university.id}`
      });
    }
  }, [navigation, onUniversityPress]);

  // Tea post like handler
  const handleLike = useCallback(async (e) => {
    e?.stopPropagation?.();
    if (!isTeaPost) return;
    
    const wasLiked = userReaction === "up";
    const newReaction = wasLiked ? null : "up";
    
    // Optimistic update
    setUserReaction(newReaction);
    setLocalCounts(prev => ({
      ...prev,
      likes: wasLiked ? Math.max(0, prev.likes - 1) : prev.likes + 1
    }));

    try {
      if (onReaction) {
        await onReaction(post.id, newReaction);
      }
    } catch (error) {
      console.error('Error liking post:', error);
      // Revert on error
      setUserReaction(userReaction);
      setLocalCounts(prev => ({
        ...prev,
        likes: post?.likes || 0
      }));
    }
  }, [isTeaPost, userReaction, post.id, onReaction]);

  // Flag post vote handler
  const handleFlagVote = useCallback(async (vote) => {
    if (!isFlagPost) return;
    
    const wasVoted = userFlagVote === vote;
    const newVote = wasVoted ? null : vote;
    
    // Optimistic update
    setUserFlagVote(newVote);
    setLocalCounts(prev => {
      const newCounts = { ...prev };
      
      // Remove previous vote
      if (userFlagVote === "red") newCounts.red_votes = Math.max(0, newCounts.red_votes - 1);
      if (userFlagVote === "green") newCounts.green_votes = Math.max(0, newCounts.green_votes - 1);
      
      // Add new vote
      if (newVote === "red") newCounts.red_votes += 1;
      if (newVote === "green") newCounts.green_votes += 1;
      
      return newCounts;
    });

    try {
      if (onFlagVote) {
        await onFlagVote(post.id, newVote);
      }
    } catch (error) {
      console.error('Error voting on flag:', error);
      // Revert on error
      setUserFlagVote(userFlagVote);
      setLocalCounts({
        likes: post?.likes || 0,
        red_votes: post?.red_votes || 0,
        green_votes: post?.green_votes || 0,
        replies: post?.replies_count || 0,
      });
    }
  }, [isFlagPost, userFlagVote, post.id, onFlagVote]);

  // Other action handlers
  const handleSavePress = useCallback((e) => {
    e?.stopPropagation?.();
    onSave?.(post.id);
  }, [onSave, post.id]);

  const handleRepostPress = useCallback((e) => {
    e?.stopPropagation?.();
    onRepost?.(post.id);
  }, [onRepost, post.id]);

  const handleAvatarPress = useCallback((e) => {
    e?.stopPropagation?.();
    onAvatarPress?.(post.author);
  }, [onAvatarPress, post.author]);

  const handleCommentPress = useCallback((e) => {
    e?.stopPropagation?.();
    if (onComment) {
      onComment(post);
    } else {
      handlePostPress();
    }
  }, [onComment, post, handlePostPress]);

  const handleSharePress = useCallback((e) => {
    e?.stopPropagation?.();
    onShare?.(post);
  }, [onShare, post]);

  // Poll voting handler
  const handlePollVote = useCallback(async (optionId) => {
    if (!localPoll || !localPoll.is_active) return;
    
    if (localPoll.user_voted && localPoll.user_vote_option === optionId) {
      return;
    }

    try {
      const updatedPoll = await voteOnPoll(localPoll.id, optionId);
      setLocalPoll(updatedPoll);
      onPollVote?.(post.id, optionId, updatedPoll);
    } catch (error) {
      console.error('Error voting on poll:', error);
      Alert.alert('Error', 'Failed to cast vote. Please try again.');
    }
  }, [localPoll, post.id, onPollVote]);

  // Get post type information
  const getPostTypeInfo = useCallback(() => {
    if (post?.flag === "red") return { emoji: "🚩", label: "Red Flag", color: "#ef4444" };
    if (post?.flag === "green") return { emoji: "💚", label: "Green Flag", color: "#22c55e" };
    return { emoji: "🫖", label: "Tea", color: theme.colors.secondary };
  }, [post?.flag, theme.colors.secondary]);

  // Safe data extraction
  const imageUri = safeImageUri(post?.image || post?.image_src || post?.image_url);
  const isSaved = post?.is_saved || post?.saved || false;
  const postType = getPostTypeInfo();
  
  // Render hashtags
  const renderHashtags = useCallback(() => {
    if (!post?.hashtags || post.hashtags.length === 0) return null;

    return (
      <View style={styles.hashtagsContainer}>
        {post.hashtags.slice(0, 3).map((tag, index) => {
          const hashtagName = typeof tag === 'string' ? tag : tag?.name || tag?.text;
          const displayName = hashtagName?.startsWith('#') ? hashtagName : `#${hashtagName}`;
          
          return (
            <TouchableOpacity 
              key={`hashtag-${post.id}-${index}`}
              style={[styles.hashtag, { backgroundColor: theme.colors.accent + '15' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleHashtagPress(hashtagName);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.hashtagText, { color: theme.colors.accent }]}>
                {displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
        {post.hashtags.length > 3 && (
          <Text style={[styles.moreHashtags, { color: theme.colors.secondary }]}>
            +{post.hashtags.length - 3} more
          </Text>
        )}
      </View>
    );
  }, [post?.hashtags, post?.id, theme.colors.accent, theme.colors.secondary, handleHashtagPress]);

  // Render content with clickable hashtags
  const renderContent = useCallback(() => {
    if (!post?.content) return null;

    const hashtagRegex = /#[\w]+/g;
    const parts = post.content.split(hashtagRegex);
    const hashtags = post.content.match(hashtagRegex) || [];

    if (hashtags.length === 0) {
      return (
        <Text style={[styles.content, { color: theme.colors.text }]}>
          {post.content}
        </Text>
      );
    }

    return (
      <Text style={[styles.content, { color: theme.colors.text }]}>
        {parts.map((part, index) => (
          <React.Fragment key={`content-${post.id}-${index}`}>
            {part}
            {hashtags[index] && (
              <Text 
                style={[styles.inlineHashtag, { color: theme.colors.accent }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleHashtagPress(hashtags[index]);
                }}
              >
                {hashtags[index]}
              </Text>
            )}
          </React.Fragment>
        ))}
      </Text>
    );
  }, [post?.content, post?.id, theme.colors.text, theme.colors.accent, handleHashtagPress]);

  // Render poll
  const renderPoll = useCallback(() => {
    if (!localPoll) return null;

    return (
      <View style={[styles.pollContainer, { 
        backgroundColor: theme.colors.surface || theme.colors.card, 
        borderColor: theme.colors.border 
      }]}>
        <Text style={[styles.pollQuestion, { color: theme.colors.text }]}>
          {localPoll.question}
        </Text>
        
        {localPoll.options?.map((option) => {
          const percentage = localPoll.total_votes > 0 
            ? Math.round((option.votes / localPoll.total_votes) * 100) 
            : 0;
          const isSelected = localPoll.user_voted && localPoll.user_vote_option === option.id;
          const showResults = localPoll.user_voted || !localPoll.is_active;
          
          return (
            <TouchableOpacity
              key={`poll-option-${option.id}`}
              style={[
                styles.pollOption,
                { 
                  backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.primary,
                  borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                  opacity: localPoll.is_active ? 1 : 0.7
                }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                if (localPoll.is_active) {
                  handlePollVote(option.id);
                }
              }}
              disabled={!localPoll.is_active}
            >
              <View style={styles.pollOptionContent}>
                <Text style={[styles.pollOptionText, { color: theme.colors.text }]}>
                  {option.text}
                </Text>
                {showResults && (
                  <View style={styles.pollStats}>
                    <Text style={[styles.pollVoteCount, { color: theme.colors.secondary }]}>
                      {option.votes || 0}
                    </Text>
                    <Text style={[styles.pollPercentage, { color: theme.colors.secondary }]}>
                      {percentage}%
                    </Text>
                  </View>
                )}
              </View>
              
              {showResults && (
                <View style={[styles.pollProgress, { backgroundColor: theme.colors.border }]}>
                  <View 
                    style={[
                      styles.pollProgressFill, 
                      { 
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.secondary + '40',
                        width: `${percentage}%` 
                      }
                    ]} 
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        
        <Text style={[styles.pollMeta, { color: theme.colors.secondary }]}>
          {localPoll.total_votes || 0} vote{(localPoll.total_votes || 0) !== 1 ? 's' : ''} • {localPoll.is_active ? 'Active' : 'Ended'}
          {localPoll.expires_at && localPoll.is_active && (
            <Text> • Ends {new Date(localPoll.expires_at).toLocaleDateString()}</Text>
          )}
        </Text>
      </View>
    );
  }, [localPoll, theme, handlePollVote]);

  // Early return if no post data
  if (!post) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={[styles.container, { 
        backgroundColor: theme.colors.surface || theme.colors.card,
        borderBottomColor: theme.colors.border,
      }]}
      onPress={handlePostPress}
      activeOpacity={0.95}
    >
      {/* Seen indicator */}
      {showSeenIndicator && (
        <View style={[styles.seenIndicator, { backgroundColor: theme.colors.accent + '20' }]}>
          <Ionicons name="eye" size={10} color={theme.colors.accent} />
        </View>
      )}

      {/* Header with person details */}
      <View style={styles.header}>
        <View style={styles.personInfo}>
          <Text style={[styles.personName, { color: theme.colors.text }]}>
            {postType.emoji} {post.first_name}
            {post.person_age && (
              <Text style={[styles.personAge, { color: theme.colors.secondary }]}>
                {` (${post.person_age})`}
              </Text>
            )}
          </Text>
          <View style={styles.metaInfo}>
            <Text style={[styles.authorHandle, { color: theme.colors.secondary }]}>
              @{post.author?.name || 'user'}
            </Text>
            <Text style={[styles.dot, { color: theme.colors.secondary }]}> • </Text>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                handleUniversityPress(post.university);
              }}
            >
              <View style={[styles.universityBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                <Text style={[styles.universityText, { color: theme.colors.accent }]}>
                  {post.university?.name || post.university || 'University'}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={[styles.dot, { color: theme.colors.secondary }]}> • </Text>
            <Text style={[styles.timestamp, { color: theme.colors.secondary }]}>
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

      {/* Post content with clickable hashtags */}
      {renderContent()}

      {/* Post image */}
      {imageUri && (
        <Image 
          source={{ uri: imageUri }} 
          style={styles.image}
          resizeMode="cover"
          onError={(e) => {
            console.warn("PostCard image failed:", imageUri, e?.nativeEvent?.error);
          }}
        />
      )}

      {/* Hashtags */}
      {renderHashtags()}

      {/* Poll section */}
      {renderPoll()}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.viewsContainer}>
          <Ionicons name="eye-outline" size={14} color={theme.colors.secondary} />
          <Animated.View style={{ opacity: Animated.add(1, fadeAnim) }}>
            <Text style={[styles.statText, { color: theme.colors.secondary }]}>
              {localViewCount.toLocaleString()}
            </Text>
          </Animated.View>
        </View>
        
        {/* Show different scores for different post types */}
        {isFlagPost ? (
          <View style={styles.voteScore}>
            <Ionicons 
              name={localCounts.green_votes > localCounts.red_votes ? "trending-up" : 
                    localCounts.red_votes > localCounts.green_votes ? "trending-down" : "remove-outline"} 
              size={14} 
              color={localCounts.green_votes > localCounts.red_votes ? "#22c55e" : 
                    localCounts.red_votes > localCounts.green_votes ? "#ef4444" : theme.colors.secondary} 
            />
            <Text style={[
              styles.statText, 
              { color: localCounts.green_votes > localCounts.red_votes ? "#22c55e" : 
                      localCounts.red_votes > localCounts.green_votes ? "#ef4444" : theme.colors.secondary }
            ]}>
              {localCounts.green_votes > localCounts.red_votes && "+"}
              {localCounts.green_votes - localCounts.red_votes}
            </Text>
          </View>
        ) : (
          <View style={styles.likesContainer}>
            <Ionicons name="heart-outline" size={14} color={theme.colors.secondary} />
            <Text style={[styles.statText, { color: theme.colors.secondary }]}>
              {localCounts.likes}
            </Text>
          </View>
        )}
        
        <View style={styles.repliesContainer}>
          <Ionicons name="chatbubble-outline" size={14} color={theme.colors.secondary} />
          <Text style={[styles.statText, { color: theme.colors.secondary }]}>
            {localCounts.replies}
          </Text>
        </View>
      </View>

      {/* Interaction Bar */}
      <View style={styles.interactionBar}>
        {isTeaPost ? (
          // Tea Post: Like button only
          <TouchableOpacity 
            style={[
              styles.interactionButton, 
              userReaction === "up" && { backgroundColor: theme.colors.accent + '15' }
            ]}
            onPress={handleLike}
          >
            <Ionicons 
              name={userReaction === "up" ? "heart" : "heart-outline"} 
              size={20} 
              color={userReaction === "up" ? theme.colors.accent : theme.colors.secondary} 
            />
            <Text style={[
              styles.interactionCount, 
              { 
                color: userReaction === "up" ? theme.colors.accent : theme.colors.secondary,
                fontWeight: userReaction === "up" ? "600" : "400"
              }
            ]}>
              {localCounts.likes}
            </Text>
          </TouchableOpacity>
        ) : (
          // Flag Post: Red/Green vote buttons
          <View style={styles.flagVoteContainer}>
            <TouchableOpacity 
              style={[
                styles.flagVoteButton, 
                { backgroundColor: "#ef4444" + '10' },
                userFlagVote === "red" && { 
                  backgroundColor: "#ef4444" + '20', 
                  borderWidth: 1, 
                  borderColor: "#ef4444" 
                }
              ]}
              onPress={() => handleFlagVote("red")}
            >
              <Ionicons 
                name="flag" 
                size={18} 
                color={userFlagVote === "red" ? "#ef4444" : "#ef4444" + 'AA'} 
              />
              <Text style={[
                styles.flagVoteCount, 
                { 
                  color: userFlagVote === "red" ? "#ef4444" : "#ef4444" + 'AA',
                  fontWeight: userFlagVote === "red" ? "600" : "400"
                }
              ]}>
                {localCounts.red_votes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.flagVoteButton, 
                { backgroundColor: "#22c55e" + '10' },
                userFlagVote === "green" && { 
                  backgroundColor: "#22c55e" + '20', 
                  borderWidth: 1, 
                  borderColor: "#22c55e" 
                }
              ]}
              onPress={() => handleFlagVote("green")}
            >
              <Ionicons 
                name="flag" 
                size={18} 
                color={userFlagVote === "green" ? "#22c55e" : "#22c55e" + 'AA'} 
              />
              <Text style={[
                styles.flagVoteCount, 
                { 
                  color: userFlagVote === "green" ? "#22c55e" : "#22c55e" + 'AA',
                  fontWeight: userFlagVote === "green" ? "600" : "400"
                }
              ]}>
                {localCounts.green_votes}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Comments */}
        <TouchableOpacity 
          style={styles.interactionButton}
          onPress={handleCommentPress}
        >
          <Ionicons name="chatbubble-outline" size={20} color={theme.colors.secondary} />
          <Text style={[styles.interactionCount, { color: theme.colors.secondary }]}>
            {localCounts.replies}
          </Text>
        </TouchableOpacity>

        {/* Repost Button */}
        <TouchableOpacity
          style={[
            styles.interactionButton,
            { backgroundColor: post?.is_reposted ? '#10b98115' : 'transparent' }
          ]}
          onPress={handleRepostPress}
        >
          <Ionicons 
            name={post?.is_reposted ? "repeat" : "repeat-outline"} 
            size={20} 
            color={post?.is_reposted ? '#10b981' : theme.colors.secondary} 
          />
          {post?.reposts_count > 0 && (
            <Text style={[
              styles.interactionCount, 
              { color: post?.is_reposted ? '#10b981' : theme.colors.secondary }
            ]}>
              {post.reposts_count}
            </Text>
          )}
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.interactionButton,
            { backgroundColor: isSaved ? theme.colors.accent + '15' : 'transparent' }
          ]}
          onPress={handleSavePress}
        >
          <Ionicons 
            name={isSaved ? "bookmark" : "bookmark-outline"} 
            size={20} 
            color={isSaved ? theme.colors.accent : theme.colors.secondary} 
          />
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity 
          style={styles.interactionButton}
          onPress={handleSharePress}
        >
          <Ionicons name="share-outline" size={20} color={theme.colors.secondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.post?.id === nextProps.post?.id &&
    prevProps.post?.likes === nextProps.post?.likes &&
    prevProps.post?.red_votes === nextProps.post?.red_votes &&
    prevProps.post?.green_votes === nextProps.post?.green_votes &&
    prevProps.post?.user_reaction === nextProps.post?.user_reaction &&
    prevProps.post?.user_flag_vote === nextProps.post?.user_flag_vote &&
    (prevProps.post?.is_saved || prevProps.post?.saved) === (nextProps.post?.is_saved || nextProps.post?.saved) &&
    JSON.stringify(prevProps.post?.poll) === JSON.stringify(nextProps.post?.poll) &&
    prevProps.showSeenIndicator === nextProps.showSeenIndicator &&
    prevProps.isViewing === nextProps.isViewing
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  
  seenIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  personAge: {
    fontSize: 16,
    fontWeight: "500",
  },
  metaInfo: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  authorHandle: {
    fontSize: 14,
    fontWeight: "500",
  },
  dot: {
    fontSize: 14,
  },
  universityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  universityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
  },
  flagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  flagText: {
    fontSize: 12,
    fontWeight: "600",
  },

  content: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  inlineHashtag: {
    fontWeight: '600',
  },
  
  image: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
  },

  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  hashtag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hashtagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreHashtags: {
    fontSize: 12,
    fontStyle: 'italic',
  },

  // Poll styles
  pollContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 22,
  },
  pollOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  pollOptionText: {
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
  pollStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollVoteCount: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'right',
  },
  pollPercentage: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 35,
    textAlign: 'right',
  },
  pollProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  pollProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  pollMeta: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  repliesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    fontWeight: '500',
  },

  interactionBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  interactionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
    minWidth: 44,
    justifyContent: 'center',
  },
  interactionCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  flagVoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  flagVoteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  flagVoteCount: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
  },
});

// Set display name for debugging
PostCard.displayName = 'PostCard';

export default PostCard;