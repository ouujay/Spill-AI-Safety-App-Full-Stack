// screens/ExploreListScreen.js - COMPLETE FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import MinimalPostCard from "../components/MinimalPostCard";
import FollowButton from '../components/FollowButton';
import { getHashtagPosts, getUniversityPosts } from '../api/api';
import { getHashtagStats, getUniversityStats } from '../api/notifications';

export default function ExploreListScreen({ route }) {
  const { type, id, title, university } = route.params;
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState({ follower_count: 0, post_count: 0 });

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: title || (type === "hashtag" ? `#${id}` : "Posts"),
      headerTitleStyle: { color: theme.colors.text },
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.text,
    });
  }, [navigation, title, theme, type, id]);

  // Load posts and stats when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [type, id])
  );

  // Load posts function
  const loadPosts = async (refresh = false) => {
    const currentPage = refresh ? 1 : page;
    
    try {
      if (type === "hashtag") {
        console.log(`Loading hashtag posts for: ${id}, page: ${currentPage}`);
        return await getHashtagPosts(id, {
          page: currentPage,
          page_size: 20,
        });
      } else if (type === "university") {
        console.log(`Loading university posts for: ${id}, page: ${currentPage}`);
        return await getUniversityPosts(id, {
          page: currentPage,
          page_size: 20,
        });
      }
      throw new Error("Unknown type");
    } catch (error) {
      console.error("Error in loadPosts:", error);
      throw error;
    }
  };

  // Load stats function - FIXED to use the correct API functions
  const loadStats = async () => {
    try {
      if (type === "hashtag") {
        const statsData = await getHashtagStats(id);
        setStats({
          follower_count: statsData.follower_count || 0,
          post_count: statsData.post_count || 0,
          is_following: statsData.is_following || false
        });
        console.log('Hashtag stats loaded:', statsData);
      } else if (type === "university") {
        const statsData = await getUniversityStats(id);
        setStats({ 
          follower_count: statsData.follower_count || 0,
          post_count: statsData.post_count || 0,
          is_following: statsData.is_following || false
        });
        console.log('University stats loaded:', statsData);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Don't throw error, just use defaults
      setStats({ follower_count: 0, post_count: 0 });
    }
  };

  // Load posts and stats
  const loadData = async (refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setError(null);
        setPage(1);
        setHasMore(true);
      }

      // Load posts and stats in parallel
      const [postsResponse] = await Promise.all([
        loadPosts(refresh),
        loadStats() // This updates state directly
      ]);
      
      console.log("Posts response:", postsResponse);

      if (refresh) {
        const newPosts = postsResponse.results || postsResponse.items || [];
        setPosts(newPosts);
        setHasMore(postsResponse.has_more || false);
        console.log(`Loaded ${newPosts.length} posts, hasMore: ${postsResponse.has_more}`);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) {
      console.log("Skip load more:", { loadingMore, hasMore });
      return;
    }
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      console.log(`Loading more posts, page: ${nextPage}`);
      
      const response = type === "hashtag" 
        ? await getHashtagPosts(id, { page: nextPage, page_size: 20 })
        : await getUniversityPosts(id, { page: nextPage, page_size: 20 });
      
      const newPosts = response.results || response.items || [];
      console.log(`Loaded ${newPosts.length} more posts`);
      
      if (newPosts.length > 0) {
        setPosts(prev => [...prev, ...newPosts]);
        setPage(nextPage);
        setHasMore(response.has_more || false);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleFollowChange = (newFollowStatus) => {
    // Update follower count optimistically and reload stats
    setStats(prev => ({
      ...prev,
      follower_count: newFollowStatus 
        ? prev.follower_count + 1 
        : Math.max(0, prev.follower_count - 1)
    }));
    
    // Reload actual stats after a delay
    setTimeout(() => {
      loadStats();
    }, 500);
  };

  const renderHeader = () => {
    if (type === "university") {
      const uniData = university || { name: `University ${id}` };
      return (
        <View style={styles.safeHeaderContainer}>
          <View style={[styles.headerInfo, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.universityIcon, { backgroundColor: theme.colors.accent + "20" }]}>
              <Ionicons name="school" size={24} color={theme.colors.accent} />
            </View>
            <View style={styles.universityDetails}>
              <Text style={[styles.universityName, { color: theme.colors.text }]}>
                {uniData.name}
              </Text>
              <View style={styles.statsRow}>
                <Text style={[styles.statText, { color: theme.colors.secondary }]}>
                  {stats.follower_count} followers • {stats.post_count} posts
                </Text>
              </View>
              {uniData.city && (
                <Text style={[styles.locationText, { color: theme.colors.secondary }]}>
                  <Ionicons name="location" size={12} color={theme.colors.secondary} />
                  {" "}{uniData.city.name}
                  {uniData.city.country && `, ${uniData.city.country.name}`}
                </Text>
              )}
            </View>
            <FollowButton
              type="university"
              id={id}
              name={uniData.name}
              onFollowChange={handleFollowChange}
              size="medium"
            />
          </View>
        </View>
      );
    }

    if (type === "hashtag") {
      return (
        <View style={styles.safeHeaderContainer}>
          <View style={[styles.headerInfo, { backgroundColor: theme.colors.surface }]}>
            <View style={[styles.hashtagIcon, { backgroundColor: theme.colors.accent + "20" }]}>
              <Ionicons name="pricetag" size={24} color={theme.colors.accent} />
            </View>
            <View style={styles.hashtagDetails}>
              <Text style={[styles.hashtagName, { color: theme.colors.text }]}>
                #{id}
              </Text>
              <View style={styles.statsRow}>
                <Text style={[styles.statText, { color: theme.colors.secondary }]}>
                  {stats.follower_count} followers • {stats.post_count} posts
                </Text>
              </View>
              <Text style={[styles.hashtagDesc, { color: theme.colors.secondary }]}>
                Posts tagged with #{id}
              </Text>
            </View>
            <FollowButton
              type="hashtag"
              id={id}
              name={`#${id}`}
              onFollowChange={handleFollowChange}
              size="medium"
            />
          </View>
        </View>
      );
    }

    return null;
  };

  const renderPost = ({ item }) => (
    <MinimalPostCard
      post={item}
      onPress={(post) => navigation.navigate('PostDetail', { 
        postId: post.id, 
        initialPost: post 
      })}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={[styles.loadingMoreText, { color: theme.colors.secondary }]}>
          Loading more posts...
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={type === "hashtag" ? "pricetag" : "school"} 
        size={48} 
        color={theme.colors.secondary} 
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Posts Found
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.secondary }]}>
        {type === "hashtag" 
          ? `No posts found for #${id}` 
          : `No posts found for this university`
        }
      </Text>
      <TouchableOpacity 
        onPress={() => loadData(true)}
        style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color="#ef4444" />
      <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
        Something went wrong
      </Text>
      <Text style={[styles.errorSubtitle, { color: theme.colors.secondary }]}>
        {error || "Failed to load posts"}
      </Text>
      <TouchableOpacity 
        onPress={() => loadData(true)}
        style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
            Loading posts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && posts.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={posts.length === 0 ? styles.emptyContentContainer : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeHeaderContainer: {
    paddingTop: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  universityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hashtagIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  universityDetails: {
    flex: 1,
  },
  hashtagDetails: {
    flex: 1,
  },
  universityName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hashtagName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsRow: {
    marginBottom: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
  },
  locationText: {
    fontSize: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hashtagDesc: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  loadingMore: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContentContainer: {
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});