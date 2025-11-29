// components/ThreadedReplyItem.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import {
  formatReplyCountText,
  formatLoadMoreText,
  formatContinueThreadText,
  shouldShowContinueThread
} from '../api/api';

const MAX_NESTED_LEVELS = 2;

const ThreadedReplyItem = ({
  reply,
  level = 0,
  onReaction,
  onReply,
  onToggleReplies,
  onLoadMore,
  onChangeSortOrder,
  onContinueThread,
  repliesState,
  nestedReplies = [],
  renderNestedReply,
}) => {
  const { theme } = useTheme();
  
  const hasReplies = (reply.replies_count || 0) > 0;
  const canNestDeeper = level < MAX_NESTED_LEVELS;
  const shouldContinue = shouldShowContinueThread(level, MAX_NESTED_LEVELS) && hasReplies;

  return (
    <View style={[
      styles.replyContainer, 
      { 
        borderBottomColor: theme.colors.border,
        marginLeft: level * 20, // Indent based on nesting level
      }
    ]}>
      {/* Reply Header */}
      <View style={styles.replyHeader}>
        <View style={[styles.replyAvatar, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.replyAvatarText}>
            {reply.author?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        
        <View style={styles.replyInfo}>
          <Text style={[styles.replyAuthor, { color: theme.colors.text }]}>
            {reply.author?.name || 'Anonymous'}
            {reply._isOptimistic && (
              <Text style={[styles.youBadge, { color: theme.colors.accent }]}> • You</Text>
            )}
          </Text>
          <Text style={[styles.replyMeta, { color: theme.colors.secondary }]}>
            {new Date(reply.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Reply Content */}
      <Text style={[styles.replyContent, { color: theme.colors.text }]}>
        {reply.content}
      </Text>

      {/* Reply Actions */}
      <View style={styles.replyActions}>
        <TouchableOpacity 
          style={styles.replyActionButton}
          onPress={() => onReaction(reply.id, 'up')}
        >
          <Ionicons 
            name={reply.user_reaction === 'up' ? "arrow-up" : "arrow-up-outline"} 
            size={16} 
            color={reply.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary} 
          />
          <Text style={[
            styles.replyActionText, 
            { color: reply.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary }
          ]}>
            {reply.like_count || reply.upvotes || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.replyActionButton}
          onPress={() => onReaction(reply.id, 'down')}
        >
          <Ionicons 
            name={reply.user_reaction === 'down' ? "arrow-down" : "arrow-down-outline"} 
            size={16} 
            color={reply.user_reaction === 'down' ? '#ef4444' : theme.colors.secondary} 
          />
          <Text style={[
            styles.replyActionText, 
            { color: reply.user_reaction === 'down' ? '#ef4444' : theme.colors.secondary }
          ]}>
            {reply.dislike_count || reply.downvotes || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.replyActionButton}
          onPress={() => onReply(reply, level)}
        >
          <Ionicons name="chatbubble-outline" size={16} color={theme.colors.secondary} />
          <Text style={[styles.replyActionText, { color: theme.colors.secondary }]}>
            Reply
          </Text>
        </TouchableOpacity>

        {/* Nested replies toggle or continue thread */}
        {hasReplies && (
          <TouchableOpacity 
            style={styles.replyActionButton}
            onPress={() => shouldContinue 
              ? onContinueThread(reply)
              : onToggleReplies(reply.id, reply.replies_count)
            }
          >
            <Ionicons 
              name={shouldContinue ? "arrow-forward" : "chatbubbles-outline"} 
              size={16} 
              color={theme.colors.secondary} 
            />
            <Text style={[styles.replyActionText, { color: theme.colors.secondary }]}>
              {shouldContinue 
                ? formatContinueThreadText(reply.replies_count)
                : formatReplyCountText(reply.replies_count, repliesState?.expanded)
              }
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nested Replies (if expanded and within depth limit) */}
      {canNestDeeper && repliesState?.expanded && (
        <View style={styles.nestedRepliesContainer}>
          {/* Loading indicator */}
          {repliesState.loading && (
            <View style={styles.nestedLoadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text style={[styles.nestedLoadingText, { color: theme.colors.secondary }]}>
                Loading replies...
              </Text>
            </View>
          )}

          {/* Error state */}
          {repliesState.error && (
            <TouchableOpacity 
              style={styles.errorContainer}
              onPress={() => onToggleReplies(reply.id, reply.replies_count, true)} // force refresh
            >
              <Text style={[styles.errorText, { color: '#ef4444' }]}>
                {repliesState.error}
              </Text>
            </TouchableOpacity>
          )}

          {/* Nested reply items */}
          {nestedReplies?.map((nestedReply) => (
            <View key={nestedReply.id}>
              {renderNestedReply && renderNestedReply(nestedReply, level + 1)}
            </View>
          ))}

          {/* Load more nested replies */}
          {repliesState.next && !repliesState.loading && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => onLoadMore(reply.id)}
            >
              <Text style={[styles.loadMoreText, { color: theme.colors.accent }]}>
                {formatLoadMoreText(
                  repliesState.total - repliesState.items.length
                )}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  replyContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  replyAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  replyInfo: { 
    flex: 1 
  },
  replyAuthor: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  youBadge: {
    fontSize: 12,
    fontWeight: '500',
  },
  replyMeta: {
    fontSize: 12,
  },
  replyContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: 'row',
    gap: 12,
  },
  replyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  replyActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nestedRepliesContainer: {
    marginTop: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e5e5e5',
  },
  nestedLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  nestedLoadingText: {
    fontSize: 14,
  },
  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ThreadedReplyItem;