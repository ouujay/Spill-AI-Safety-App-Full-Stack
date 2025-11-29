// screens/NotificationsScreen.js - FIXED VERSION
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useNotifications } from '../hooks/useNotifications';
import { 
  getNotificationMessage, 
  getNotificationIcon, 
  markSingleNotificationRead 
} from '../api/notifications';

export default function NotificationsScreen({ navigation }) {
  const { theme } = useTheme();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    hasMore,
    error,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const handleNotificationPress = useCallback(async (notification) => {
    try {
      console.log('📱 Handling notification press:', notification.id);
      
      // FIXED: Mark notification as read using the single notification endpoint
      if (!notification.is_read) {
        console.log('📝 Marking notification as read:', notification.id);
        await markSingleNotificationRead(notification.id);
        
        // Update local state through the hook
        await markAsRead([notification.id]);
      }

      // Navigate to post details if notification has a post
      if (notification.post && notification.post.id) {
        console.log('🔗 Navigating to post:', notification.post.id);
        navigation.navigate('PostDetail', {
          postId: notification.post.id,
          post: notification.post,
        });
      }
    } catch (error) {
      console.error('❌ Error handling notification press:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    }
  }, [markAsRead, navigation]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      console.log('📝 Marking all notifications as read');
      await markAllAsRead();
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  }, [markAllAsRead]);

  const renderNotificationItem = useCallback(({ item: notification }) => {
    // FIXED: Now uses consistent format with home feed (first_name, age)
    const message = getNotificationMessage(notification);
    const iconName = getNotificationIcon(notification.kind);
    const isUnread = !notification.is_read;
    
    // Format time
    const createdAt = new Date(notification.created_at);
    const now = new Date();
    const timeDiff = now - createdAt;
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    let timeText;
    if (days > 0) {
      timeText = `${days}d ago`;
    } else if (hours > 0) {
      timeText = `${hours}h ago`;
    } else {
      const minutes = Math.floor(timeDiff / (1000 * 60));
      timeText = minutes > 0 ? `${minutes}m ago` : 'Just now';
    }

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: isUnread ? theme.colors.accent + '10' : theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={() => handleNotificationPress(notification)}
        activeOpacity={0.8}
      >
        {/* Unread indicator */}
        {isUnread && (
          <View style={[styles.unreadIndicator, { backgroundColor: theme.colors.accent }]} />
        )}

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
          <Ionicons name={iconName} size={20} color={theme.colors.accent} />
        </View>

        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={[styles.message, { color: theme.colors.text }]} numberOfLines={2}>
            {message}
          </Text>
          
          {/* Post preview if available */}
          {notification.post && (
            <View style={styles.postPreview}>
              <Text 
                style={[styles.postContent, { color: theme.colors.secondary }]} 
                numberOfLines={1}
              >
                {notification.post.content || 'View post'}
              </Text>
              {notification.post.image_url && (
                <Image 
                  source={{ uri: notification.post.image_url }} 
                  style={styles.postImage}
                  resizeMode="cover"
                />
              )}
            </View>
          )}
          
          <Text style={[styles.timeText, { color: theme.colors.secondary }]}>
            {timeText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, [theme, handleNotificationPress]);

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
      <View style={styles.headerLeft}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Notifications
        </Text>
        {unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.colors.accent }]}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>
      
      {unreadCount > 0 && (
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
          <Text style={[styles.markAllText, { color: theme.colors.accent }]}>
            Mark all read
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-outline" size={64} color={theme.colors.secondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No notifications yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.secondary }]}>
        We'll notify you when there's something new
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading || notifications.length === 0) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={[styles.footerText, { color: theme.colors.secondary }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle" size={48} color="#ef4444" />
      <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.errorSubtitle, { color: theme.colors.secondary }]}>
        {error}
      </Text>
      <TouchableOpacity 
        onPress={() => refresh()}
        style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
            Loading notifications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        {renderHeader()}
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      
      {renderHeader()}
      
      <FlatList
        data={notifications}
        keyExtractor={(item) => `notification-${item.id}`}
        renderItem={renderNotificationItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContainer}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
    position: 'relative',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 4,
    top: 20,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  message: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  postPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  postContent: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
  },
  postImage: {
    width: 32,
    height: 32,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});