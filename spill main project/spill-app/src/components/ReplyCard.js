// components/ReplyCard.js - Individual reply card with reactions
import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

const ReplyCard = ({ 
  reply, 
  onReaction, 
  showPinnedBadge = false,
  isOptimistic = false 
}) => {
  const { theme } = useTheme();

  // Handle upvote
  const handleUpvote = useCallback(() => {
    if (!isOptimistic) {
      onReaction(reply.id, 'up');
    }
  }, [reply.id, onReaction, isOptimistic]);

  // Handle downvote
  const handleDownvote = useCallback(() => {
    if (!isOptimistic) {
      onReaction(reply.id, 'down');
    }
  }, [reply.id, onReaction, isOptimistic]);

  // Format time ago
  const getTimeAgo = useCallback((dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 2592000)}mo`;
  }, []);

  return (
    <View style={[
      styles.container,
      { backgroundColor: theme.colors.surface },
      isOptimistic && styles.optimisticReply,
      showPinnedBadge && { borderLeftColor: theme.colors.accent, borderLeftWidth: 3 }
    ]}>
      {/* Pinned Badge */}
      {showPinnedBadge && (
        <View style={[styles.pinnedBadge, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.pinnedText}>You</Text>
        </View>
      )}

      {/* Author Info */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.border }]}>
          <Text style={[styles.avatarText, { color: theme.colors.text }]}>
            {reply.author?.name?.[0]?.toUpperCase() || 'U'}
          </Text>
        </View>
        
        <View style={styles.authorInfo}>
          <Text style={[styles.authorName, { color: theme.colors.text }]}>
            {reply.author?.name || 'Unknown'}
          </Text>
          <Text style={[styles.university, { color: theme.colors.secondary }]}>
            {reply.university} • {getTimeAgo(reply.created_at)}
          </Text>
        </View>

        {/* Engagement Score (for debugging - remove in production) */}
        {__DEV__ && reply.engagement_score && (
          <Text style={[styles.debugScore, { color: theme.colors.secondary }]}>
            {reply.engagement_score.toFixed(1)}
          </Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.contentText, { color: theme.colors.text }]}>
          {reply.content}
        </Text>

        {/* Image if present */}
        {reply.image && (
          <Image 
            source={{ uri: reply.image }} 
            style={styles.replyImage}
            resizeMode="cover"
          />
        )}

        {/* Hashtags */}
        {reply.hashtags && reply.hashtags.length > 0 && (
          <View style={styles.hashtags}>
            {reply.hashtags.map((tag, index) => (
              <Text 
                key={index} 
                style={[styles.hashtag, { color: theme.colors.accent }]}
              >
                {tag}
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Upvote */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            reply.user_reaction === 'up' && { backgroundColor: theme.colors.accent + '20' }
          ]}
          onPress={handleUpvote}
          disabled={isOptimistic}
        >
          {isOptimistic ? (
            <ActivityIndicator size="small" color={theme.colors.secondary} />
          ) : (
            <>
              <Ionicons 
                name={reply.user_reaction === 'up' ? "arrow-up" : "arrow-up-outline"} 
                size={16} 
                color={reply.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary} 
              />
              <Text style={[
                styles.actionText, 
                { color: reply.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary }
              ]}>
                {reply.upvotes || 0}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Downvote */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            reply.user_reaction === 'down' && { backgroundColor: '#ef444420' }
          ]}
          onPress={handleDownvote}
          disabled={isOptimistic}
        >
          <Ionicons 
            name={reply.user_reaction === 'down' ? "arrow-down" : "arrow-down-outline"} 
            size={16} 
            color={reply.user_reaction === 'down' ? '#ef4444' : theme.colors.secondary} 
          />
          <Text style={[
            styles.actionText, 
            { color: reply.user_reaction === 'down' ? '#ef4444' : theme.colors.secondary }
          ]}>
            {reply.downvotes || 0}
          </Text>
        </TouchableOpacity>

        {/* Reply to reply (future feature) */}
        <TouchableOpacity 
          style={styles.actionButton}
          disabled={true} // Disabled for now
        >
          <Ionicons 
            name="chatbubble-outline" 
            size={16} 
            color={theme.colors.secondary} 
          />
          <Text style={[styles.actionText, { color: theme.colors.secondary }]}>
            {reply.direct_replies_count || 0}
          </Text>
        </TouchableOpacity>

        {/* Posting indicator */}
        {isOptimistic && (
          <View style={styles.postingIndicator}>
            <Text style={[styles.postingText, { color: theme.colors.secondary }]}>
              Posting...
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 2,
    position: 'relative',
  },
  optimisticReply: {
    opacity: 0.7,
  },
  pinnedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 1,
  },
  pinnedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  university: {
    fontSize: 12,
    marginTop: 1,
  },
  debugScore: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  content: {
    marginBottom: 8,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 20,
  },
  replyImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  hashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  hashtag: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  postingIndicator: {
    marginLeft: 'auto',
  },
  postingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default memo(ReplyCard);