// components/RepliesList.js
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
import ThreadedReplyItem from './ThreadedReplyItem';
import { formatLoadMoreText } from '../api/api';

const RepliesList = ({
  mainThreadState,
  onReplyReaction,
  onStartReplyingTo,
  onToggleReplies,
  onLoadMoreReplies,
  onChangeSortOrder,
  onContinueThread,
  onRetryFetch,
  threads,
  postId,
}) => {
  const { theme } = useTheme();

  if (!mainThreadState?.expanded) return null;

  const renderReplyItem = ({ reply, level = 0 }) => {
    const replyThreadState = threads[reply.id];
    
    return (
      <ThreadedReplyItem
        key={reply.id}
        reply={reply}
        level={level}
        onReaction={onReplyReaction}
        onReply={onStartReplyingTo}
        onToggleReplies={onToggleReplies}
        onLoadMore={onLoadMoreReplies}
        onChangeSortOrder={onChangeSortOrder}
        onContinueThread={onContinueThread}
        repliesState={replyThreadState}
        nestedReplies={replyThreadState?.items || []}
        renderNestedReply={(nestedReply, nestedLevel) => 
          renderReplyItem({ reply: nestedReply, level: nestedLevel })
        }
      />
    );
  };

  return (
    <View style={styles.repliesSection}>
      {/* Loading indicator */}
      {mainThreadState.loading && mainThreadState.items.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
            Loading replies...
          </Text>
        </View>
      )}

      {/* Error state */}
      {mainThreadState.error && (
        <TouchableOpacity 
          style={styles.errorContainer}
          onPress={() => onRetryFetch(postId)}
        >
          <Text style={[styles.errorText, { color: '#ef4444' }]}>
            {mainThreadState.error}
          </Text>
        </TouchableOpacity>
      )}

      {/* Main replies */}
      {mainThreadState.items?.map((reply) => (
        <View key={reply.id}>
          {renderReplyItem({ reply, level: 0 })}
        </View>
      ))}

      {/* Load more button for main replies */}
      {mainThreadState.next && !mainThreadState.loading && (
        <TouchableOpacity
          style={styles.loadMoreButton}
          onPress={() => onLoadMoreReplies(postId)}
          disabled={mainThreadState.loading}
        >
          {mainThreadState.loading ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Text style={[styles.loadMoreText, { color: theme.colors.accent }]}>
              {formatLoadMoreText(
                mainThreadState.total - mainThreadState.items.length
              )}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Empty state */}
      {mainThreadState.items.length === 0 && !mainThreadState.loading && !mainThreadState.error && (
        <View style={styles.emptyComments}>
          <Ionicons name="chatbubble-outline" size={48} color={theme.colors.secondary} />
          <Text style={[styles.emptyCommentsText, { color: theme.colors.text }]}>
            No comments yet
          </Text>
          <Text style={[styles.emptyCommentsSubtext, { color: theme.colors.secondary }]}>
            Be the first to share your thoughts!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  repliesSection: {
    paddingTop: 8,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
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
  loadMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyCommentsText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default RepliesList;