// components/PostHeader.js - UPDATED with auto-expand logic
import React from 'react';
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
import PollComponent from './PollComponent';

const PostHeader = ({
  post,
  loading,
  onReaction,
  onPollVote,
  onToggleReplies,
  repliesExpanded,
  repliesCount,
  onSortChange,
  currentSort,
  autoExpanded = false, // NEW: Indicates if this is auto-expanded
}) => {
  const { theme } = useTheme();

  if (loading || !post) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.card }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
          Loading post...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.postContainer, { backgroundColor: theme.colors.card }]}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
          <Text style={styles.avatarText}>
            {post.author?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        
        <View style={styles.postInfo}>
          <Text style={[styles.authorName, { color: theme.colors.text }]}>
            {post.author?.name || 'Anonymous'}
          </Text>
          <Text style={[styles.postMeta, { color: theme.colors.secondary }]}>
            {post.university?.name} • {new Date(post.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Post Content */}
      <Text style={[styles.postContent, { color: theme.colors.text }]}>
        {post.content}
      </Text>

      {/* Post Image */}
      {post.image && (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: post.image }} 
            style={styles.postImage}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Poll Section */}
      {post.poll && (
        <PollComponent 
          poll={post.poll} 
          onVote={onPollVote}
          theme={theme}
        />
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onReaction('up')}
        >
          <Ionicons 
            name={post.user_reaction === 'up' ? "arrow-up" : "arrow-up-outline"} 
            size={20} 
            color={post.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary} 
          />
          <Text style={[
            styles.actionText, 
            { color: post.user_reaction === 'up' ? theme.colors.accent : theme.colors.secondary }
          ]}>
            {post.upvotes || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onReaction('down')}
        >
          <Ionicons 
            name={post.user_reaction === 'down' ? "arrow-down" : "arrow-down-outline"} 
            size={20} 
            color={post.user_reaction === 'down' ? '#ef4444' : theme.colors.secondary} 
          />
          <Text style={[
            styles.actionText, 
            { color: post.user_reaction === 'down' ? '#ef4444' : theme.colors.secondary }
          ]}>
            {post.downvotes || 0}
          </Text>
        </TouchableOpacity>

        {/* UPDATED: Only show toggle button if not auto-expanded OR if it's for nested replies */}
        {!autoExpanded && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onToggleReplies}
          >
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.secondary} />
            <Text style={[styles.actionText, { color: theme.colors.secondary }]}>
              {repliesExpanded ? 'Hide replies' : `View replies (${repliesCount || 0})`}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={theme.colors.secondary} />
          <Text style={[styles.actionText, { color: theme.colors.secondary }]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments Header and Sort Controls - UPDATED: Always show if replies exist and are expanded */}
      {(repliesExpanded || autoExpanded) && repliesCount > 0 && (
        <View style={[styles.commentsHeader, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
            Comments ({repliesCount || 0})
          </Text>
          
          {/* Only show sort controls if there are multiple replies */}
          {repliesCount > 1 && (
            <View style={styles.sortControls}>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  currentSort === 'top' && { backgroundColor: theme.colors.accent },
                ]}
                onPress={() => onSortChange('top')}
              >
                <Text style={[
                  styles.sortText,
                  { color: currentSort === 'top' ? '#fff' : theme.colors.text }
                ]}>
                  Top
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  currentSort === 'new' && { backgroundColor: theme.colors.accent },
                ]}
                onPress={() => onSortChange('new')}
              >
                <Text style={[
                  styles.sortText,
                  { color: currentSort === 'new' ? '#fff' : theme.colors.text }
                ]}>
                  New
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  postContainer: {
    padding: 16,
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  postInfo: { 
    flex: 1 
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  postMeta: {
    fontSize: 14,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  imageContainer: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 200,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  commentsHeader: {
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sortControls: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default PostHeader;