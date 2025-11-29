// components/NestedReplyItem.js - Individual nested reply with threading
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

const INDENT_WIDTH = 20; // Pixels to indent per level
const MAX_CONTENT_LENGTH = 200; // Truncate long replies

const NestedReplyItem = ({ 
  reply, 
  level = 0,
  hasReplies = false,
  canNestDeeper = true,
  repliesExpanded = false,
  repliesCount = 0,
  onReaction,
  onReply,
  onToggleReplies,
  onLoadMore,
  onChangeSortOrder,
  repliesState,
  nestedReplies = [],
  renderNestedReply
}) => {
  const { theme } = useTheme();

  // Calculate indentation
  const leftIndent = level * INDENT_WIDTH;
  const showThreadLine = level > 0;

  // Handle upvote
  const handleUpvote = useCallback(() => {
    if (!reply._isOptimistic) {
      onReaction('up');
    }
  }, [reply._isOptimistic, onReaction]);

  // Handle downvote
  const handleDownvote = useCallback(() => {
    if (!reply._isOptimistic) {
      onReaction('down');
    }
  }, [reply._isOptimistic, onReaction]);

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

  // Truncate content if too long
  const [showFullContent, setShowFullContent] = React.useState(false);
  const shouldTruncate = reply.content && reply.content.length > MAX_CONTENT_LENGTH;
  const displayContent = shouldTruncate && !showFullContent 
    ? reply.content.slice(0, MAX_CONTENT_LENGTH) + '...'
    : reply.content;

  return (
    <View style={[styles.container, { marginLeft: leftIndent }]}>
      {/* Thread line indicator */}
      {showThreadLine && (
        <View style={[
          styles.threadLine,
          { 
            backgroundColor: theme.colors.border,
            left: -INDENT_WIDTH / 2,
          }
        ]} />
      )}

      {/* Reply content */}
      <View style={[
        styles.replyContainer,
        { 
          backgroundColor: reply._isOptimistic ? theme.colors.primary + '80' : theme.colors.surface,
          borderLeftColor: level > 0 ? theme.colors.accent + '20' : 'transparent',
          borderLeftWidth: level > 0 ? 2 : 0,
        }
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.border }]}>
            <Text style={[styles.avatarText, { color: theme.colors.text }]}>
              {reply.author?.name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          
          <View style={styles.authorInfo}>
            <View style={styles.authorRow}>
              <Text style={[styles.authorName, { color: theme.colors.text }]}>
                {reply.author?.name || 'Unknown'}
              </Text>
              {reply.is_mine && (
                <View style={[styles.youBadge, { backgroundColor: theme.colors.accent }]}>
                  <Text style={styles.youText}>You</Text>
                </View>
              )}
            </View>
            <Text style={[styles.timestamp, { color: theme.colors.secondary }]}>
              {getTimeAgo(reply.created_at)}
              {reply._isOptimistic && ' • Posting...'}
            </Text>
          </View>

          {/* Engagement score (for debugging) */}
          {__DEV__ && reply.engagement_score && (
            <Text style={[styles.debugScore, { color: theme.colors.secondary }]}>
              {reply.engagement_score.toFixed(1)}
            </Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.contentText, { color: theme.colors.text }]}>
            {displayContent}
          </Text>
          
          {shouldTruncate && (
            <TouchableOpacity onPress={() => setShowFullContent(!showFullContent)}>
              <Text style={[styles.expandText, { color: theme.colors.accent }]}>
                {showFullContent ? 'Show less' : 'Show more'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Image if present */}
          {reply.image && (
            <Image 
              source={{ uri: reply.image }} 
              style={styles.replyImage}
              resizeMode="cover"
            />
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
            disabled={reply._isOptimistic}
          >
            {reply._isOptimistic ? (
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
            disabled={reply._isOptimistic}
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

          {/* Reply button */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onReply}
            disabled={reply._isOptimistic}
          >
            <Ionicons 
              name="chatbubble-outline" 
              size={16} 
              color={theme.colors.secondary} 
            />
            <Text style={[styles.actionText, { color: theme.colors.secondary }]}>
              Reply
            </Text>
          </TouchableOpacity>

          {/* Nested replies toggle */}
          {hasReplies && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={onToggleReplies}
            >
              <Ionicons 
                name={repliesExpanded ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={theme.colors.accent} 
              />
              <Text style={[styles.actionText, { color: theme.colors.accent }]}>
                {repliesExpanded ? 'Hide' : 'View'} {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nested replies section */}
        {hasReplies && repliesExpanded && (
          <View style={styles.nestedRepliesSection}>
            {/* Sort toggle for nested replies (only if there are multiple) */}
            {repliesCount > 1 && (
              <View style={styles.nestedSortContainer}>
                <TouchableOpacity
                  style={[
                    styles.nestedSortButton,
                    repliesState?.sortBy === 'top' && { backgroundColor: theme.colors.accent },
                  ]}
                  onPress={() => onChangeSortOrder('top')}
                >
                  <Text style={[
                    styles.nestedSortText,
                    { color: repliesState?.sortBy === 'top' ? '#fff' : theme.colors.secondary }
                  ]}>
                    Top
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.nestedSortButton,
                    repliesState?.sortBy === 'new' && { backgroundColor: theme.colors.accent },
                  ]}
                  onPress={() => onChangeSortOrder('new')}
                >
                  <Text style={[
                    styles.nestedSortText,
                    { color: repliesState?.sortBy === 'new' ? '#fff' : theme.colors.secondary }
                  ]}>
                    New
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Nested replies list */}
            {nestedReplies.map((nestedReply) => (
              <View key={nestedReply.id}>
                {canNestDeeper ? (
                  renderNestedReply(nestedReply)
                ) : (
                  // Max nesting reached - show as flat item with "Continue thread" option
                  <View style={styles.maxNestedContainer}>
                    <View style={[styles.flatReply, { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.flatReplyAuthor, { color: theme.colors.text }]}>
                        {nestedReply.author?.name}
                      </Text>
                      <Text style={[styles.flatReplyContent, { color: theme.colors.secondary }]}>
                        {nestedReply.content.slice(0, 100)}
                        {nestedReply.content.length > 100 ? '...' : ''}
                      </Text>
                    </View>
                    {nestedReplies.length > 1 && (
                      <TouchableOpacity style={styles.continueThreadButton}>
                        <Ionicons name="arrow-forward" size={14} color={theme.colors.accent} />
                        <Text style={[styles.continueThreadText, { color: theme.colors.accent }]}>
                          Continue thread ({nestedReplies.length} replies)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}

            {/* Load more nested replies */}
            {repliesState?.hasMore && (
              <TouchableOpacity
                style={styles.loadMoreNested}
                onPress={onLoadMore}
                disabled={repliesState?.loading}
              >
                {repliesState?.loading ? (
                  <ActivityIndicator size="small" color={theme.colors.accent} />
                ) : (
                  <>
                    <Ionicons name="add" size={14} color={theme.colors.accent} />
                    <Text style={[styles.loadMoreNestedText, { color: theme.colors.accent }]}>
                      View more replies ({repliesState.totalCount - repliesState.offset})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 4,
  },
  threadLine: {
    position: 'absolute',
    top: 40,
    bottom: 0,
    width: 2,
  },
  replyContainer: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  authorInfo: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
  },
  youBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  youText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  timestamp: {
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
    fontSize: 14,
    lineHeight: 18,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  replyImage: {
    width: '100%',
    height: 100,
    borderRadius: 6,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  nestedRepliesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  nestedSortContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 6,
  },
  nestedSortButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  nestedSortText: {
    fontSize: 11,
    fontWeight: '600',
  },
  maxNestedContainer: {
    marginVertical: 4,
  },
  flatReply: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  flatReplyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  flatReplyContent: {
    fontSize: 12,
    lineHeight: 16,
  },
  continueThreadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  continueThreadText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadMoreNested: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  loadMoreNestedText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default memo(NestedReplyItem);