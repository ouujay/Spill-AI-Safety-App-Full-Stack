// screens/SavedPostsScreen.js - Updated to use MinimalPostCard and proper API
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { useNavigation } from "@react-navigation/native";
import MinimalPostCard from "../components/MinimalPostCard";
import { getSavedPosts, unsavePost } from "../api/posts";

export default function SavedPostsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch saved posts
  const fetchSavedPosts = useCallback(async (cursor = null, isRefresh = false) => {
    try {
      if (!isRefresh && !cursor) setLoading(true);
      if (isRefresh) setRefreshing(true);
      if (cursor) setLoadingMore(true);

      const response = await getSavedPosts(cursor);
      
      // Handle different response structures
      const items = response?.results || response?.items || response?.data || [];
      const nextCursor = response?.next_cursor || response?.next || null;
      const hasMore = Boolean(nextCursor) || Boolean(response?.has_next);

      if (isRefresh || !cursor) {
        setPosts(items);
      } else {
        setPosts(prev => [...prev, ...items]);
      }
      
      setNextCursor(nextCursor);
      setHasMore(hasMore);

    } catch (error) {
      console.error("Error fetching saved posts:", error);
      Alert.alert("Error", "Failed to load saved posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSavedPosts();
  }, [fetchSavedPosts]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    fetchSavedPosts(null, true);
  }, [fetchSavedPosts]);

  // Load more
  const onEndReached = useCallback(() => {
    if (hasMore && !loading && !loadingMore && nextCursor) {
      fetchSavedPosts(nextCursor);
    }
  }, [hasMore, loading, loadingMore, nextCursor, fetchSavedPosts]);

  // Handle post press
  const handlePostPress = useCallback((post) => {
    navigation.navigate("PostDetail", { postId: post.id, post });
  }, [navigation]);

  // Handle unsave with confirmation
  const handleUnsave = useCallback(async (postId) => {
    try {
      Alert.alert(
        "Remove from Saved",
        "Remove this post from your saved posts?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              // Optimistically remove from local state
              setPosts(prev => prev.filter(p => p.id !== postId));
              
              try {
                await unsavePost(postId);
              } catch (error) {
                console.error("Failed to unsave post:", error);
                // Revert on error - re-fetch to restore state
                fetchSavedPosts(null, true);
                Alert.alert("Error", "Failed to remove post from saved. Please try again.");
              }
            }
          }
        ]
      );
    } catch (e) {
      console.log("[UNSAVE][ERR]", e);
    }
  }, [fetchSavedPosts]);

  // Render item using MinimalPostCard
  const renderItem = useCallback(({ item }) => (
    <MinimalPostCard
      post={item}
      onPress={handlePostPress}
      onUnsave={handleUnsave}
      showUnsaveButton={true}
    />
  ), [handlePostPress, handleUnsave]);

  // Key extractor
  const keyExtractor = useCallback((item) => `saved-${item.id}`, []);

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="bookmark-outline" size={64} color={theme.colors.secondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Saved Posts
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.secondary }]}>
        Posts you save will appear here
      </Text>
      <TouchableOpacity
        style={[styles.exploreButton, { backgroundColor: theme.colors.accent }]}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.exploreButtonText}>Explore Posts</Text>
      </TouchableOpacity>
    </View>
  );

  // Footer component
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
            Loading more...
          </Text>
        </View>
      );
    }
    
    if (!hasMore && posts.length > 0) {
      return (
        <View style={styles.endFooter}>
          <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
          <Text style={[styles.endText, { color: theme.colors.secondary }]}>
            You've seen all your saved posts
          </Text>
        </View>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Saved Posts
          </Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading saved posts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Saved Posts
        </Text>
        <View style={styles.headerRight}>
          {posts.length > 0 && (
            <Text style={[styles.countText, { color: theme.colors.secondary }]}>
              {posts.length} saved
            </Text>
          )}
        </View>
      </View>

      {/* Posts List */}
      <FlatList
        data={posts}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContainer,
          posts.length === 0 && styles.emptyContainer
        ]}
      />

      {/* Floating unsave button for selected posts */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: theme.colors.accent }]}
        onPress={() => {
          Alert.alert(
            "Bulk Actions",
            "Select posts to remove multiple items at once.",
            [{ text: "OK" }]
          );
        }}
      >
        <Ionicons name="create-outline" size={24} color="#fff" />
      </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  
  headerRight: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  
  countText: {
    fontSize: 14,
    fontWeight: '500',
  },
  
  listContainer: {
    paddingBottom: 100,
  },
  
  emptyContainer: {
    flexGrow: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  
  endFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  
  endText: {
    fontSize: 14,
    fontWeight: '500',
  },

  floatingButton: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});