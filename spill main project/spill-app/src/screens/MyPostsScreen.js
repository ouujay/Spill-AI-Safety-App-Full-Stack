// MyPostsScreen.js - Debug version to identify the issue
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserPosts } from '../api/posts';
import { getUserProfile } from '../api/user';
import MinimalPostCard from '../components/MinimalPostCard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/config';

export default function MyPostsScreen({ navigation }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    try {
      const profile = await getUserProfile();
      setUserProfile(profile);
      console.log('👤 User profile loaded:', profile);
      return profile;
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      setDebugInfo(prev => prev + `\nProfile Error: ${error.message}`);
      return null;
    }
  }, []);

  // Enhanced fetch function with comprehensive debugging
  const fetchPosts = useCallback(async (cursor = null, reset = false) => {
    try {
      console.log('🔄 Starting fetchPosts...', { cursor, reset });
      setDebugInfo('Starting fetch...');
      
      if (!cursor) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Check authentication
      const authToken = await AsyncStorage.getItem("accessToken");
      console.log('🔐 Auth token exists:', !!authToken);
      console.log('🔐 Auth token preview:', authToken?.substring(0, 20) + '...');
      setDebugInfo(prev => prev + `\nAuth: ${!!authToken ? 'Present' : 'Missing'}`);

      // Load user profile first
      let profile = userProfile;
      if (!profile) {
        profile = await loadUserProfile();
      }

      // Try multiple API approaches
      console.log('🧪 Testing different API approaches...');
      
      // Approach 1: Use the getUserPosts function with 'me'
      console.log('📞 API Call 1: getUserPosts("me")');
      try {
        const response1 = await getUserPosts('me', cursor);
        console.log('✅ getUserPosts response:', response1);
        setDebugInfo(prev => prev + `\nAPI 1 Success: ${response1?.results?.length || 0} posts`);
        
        const items = response1?.results || response1?.items || response1?.data || response1 || [];
        
        if (items.length > 0) {
          // Success with getUserPosts
          handleSuccessfulResponse(items, response1, reset, cursor);
          return;
        }
      } catch (error1) {
        console.log('❌ getUserPosts failed:', error1.message);
        setDebugInfo(prev => prev + `\nAPI 1 Failed: ${error1.message}`);
      }

      // Approach 2: Direct API call to user posts endpoint
      console.log('📞 API Call 2: Direct /api/posts/users/me/posts/');
      try {
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        let url = `${API_BASE_URL}/api/posts/users/me/posts/`;
        if (cursor) {
          url += `?cursor=${cursor}`;
        }

        const response2 = await fetch(url, { headers });
        const data2 = await response2.json();
        
        console.log('✅ Direct API response:', data2);
        setDebugInfo(prev => prev + `\nAPI 2: Status ${response2.status}, ${data2?.results?.length || 0} posts`);
        
        if (response2.ok && data2?.results) {
          handleSuccessfulResponse(data2.results, data2, reset, cursor);
          return;
        }
      } catch (error2) {
        console.log('❌ Direct API failed:', error2.message);
        setDebugInfo(prev => prev + `\nAPI 2 Failed: ${error2.message}`);
      }

      // Approach 3: Try with actual user ID if available
      if (profile?.id) {
        console.log('📞 API Call 3: getUserPosts with actual user ID:', profile.id);
        try {
          const response3 = await getUserPosts(profile.id, cursor);
          console.log('✅ User ID API response:', response3);
          setDebugInfo(prev => prev + `\nAPI 3: ${response3?.results?.length || 0} posts`);
          
          const items = response3?.results || response3?.items || response3?.data || response3 || [];
          if (items.length > 0) {
            handleSuccessfulResponse(items, response3, reset, cursor);
            return;
          }
        } catch (error3) {
          console.log('❌ User ID API failed:', error3.message);
          setDebugInfo(prev => prev + `\nAPI 3 Failed: ${error3.message}`);
        }
      }

      // Approach 4: General posts feed filtered by user
      console.log('📞 API Call 4: General feed filtered');
      try {
        const response4 = await fetch(`${API_BASE_URL}/api/posts/feed/?scope=my_posts&page_size=20`, {
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
          },
        });
        const data4 = await response4.json();
        
        console.log('✅ General feed response:', data4);
        setDebugInfo(prev => prev + `\nAPI 4: Status ${response4.status}, ${data4?.results?.length || 0} posts`);
        
        if (response4.ok && data4?.results) {
          handleSuccessfulResponse(data4.results, data4, reset, cursor);
          return;
        }
      } catch (error4) {
        console.log('❌ General feed failed:', error4.message);
        setDebugInfo(prev => prev + `\nAPI 4 Failed: ${error4.message}`);
      }

      // If all approaches fail
      console.log('❌ All API approaches failed');
      setDebugInfo(prev => prev + '\nAll APIs failed - showing empty state');
      
      if (!cursor) {
        setPosts([]);
      }
      setHasMore(false);

    } catch (error) {
      console.error('❌ Fatal error in fetchPosts:', error);
      setDebugInfo(prev => prev + `\nFatal Error: ${error.message}`);
      Alert.alert('Error', `Failed to load posts: ${error.message}`);
      if (!cursor) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userProfile, loadUserProfile]);

  // Helper function to handle successful API responses
  const handleSuccessfulResponse = useCallback((items, response, reset, cursor) => {
    console.log('📋 Processing successful response:', { 
      itemsCount: items.length,
      reset,
      cursor 
    });

    const nextCursorValue = response?.next_cursor || response?.next || null;
    const hasMoreData = Boolean(nextCursorValue) || Boolean(response?.has_next) || Boolean(response?.next);

    if (reset || !cursor) {
      setPosts(items);
    } else {
      setPosts(prev => [...prev, ...items]);
    }

    setNextCursor(nextCursorValue);
    setHasMore(hasMoreData);
    
    setDebugInfo(prev => prev + `\nSuccess: ${items.length} posts loaded`);
  }, []);

  // Test function to manually trigger different endpoints
  const runDiagnostics = async () => {
    console.log('🔬 Running comprehensive diagnostics...');
    Alert.alert('Diagnostics', 'Check console for detailed output');
    
    try {
      // Test auth
      const token = await AsyncStorage.getItem("accessToken");
      console.log('Auth test:', !!token);
      
      // Test profile
      const profile = await getUserProfile();
      console.log('Profile test:', profile);
      
      // Test manual API call
      const response = await fetch(`${API_BASE_URL}/api/posts/feed/?scope=for_you&page_size=5`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      const data = await response.json();
      console.log('Manual API test:', { status: response.status, data });
      
    } catch (error) {
      console.error('Diagnostics failed:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPosts(null, true);
  }, []);

  // Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setDebugInfo('Refreshing...');
    await fetchPosts(null, true);
    setRefreshing(false);
  }, [fetchPosts]);

  // Load more
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && nextCursor && posts.length > 0) {
      fetchPosts(nextCursor, false);
    }
  }, [fetchPosts, loadingMore, hasMore, nextCursor, posts.length]);

  // Handle post press
  const handlePostPress = useCallback((post) => {
    navigation.navigate("PostDetail", { postId: post.id, post });
  }, [navigation]);

  // Handle create post navigation
  const handleCreatePost = useCallback(() => {
    navigation.navigate('CreatePost');
  }, [navigation]);

  // Render individual post
  const renderPost = useCallback(({ item }) => (
    <MinimalPostCard
      post={item}
      onPress={handlePostPress}
    />
  ), [handlePostPress]);

  // Render loading footer
  const renderLoadingFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={[styles.loadingFooterText, { color: theme.colors.secondary }]}>
          Loading more posts...
        </Text>
      </View>
    );
  };

  // Render empty state with debug info
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={theme.colors.secondary} />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
        No posts found
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.colors.secondary }]}>
        This could be because you haven't created any posts yet, or there might be an API issue.
      </Text>
      
      {/* Debug information */}
      <View style={[styles.debugInfo, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.debugText, { color: theme.colors.secondary }]}>
          Debug Info:{debugInfo}
        </Text>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.createPostButton, { backgroundColor: theme.colors.accent }]}
          onPress={handleCreatePost}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createPostButtonText}>Create Post</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.diagnosticsButton, { backgroundColor: theme.colors.secondary }]}
          onPress={runDiagnostics}
        >
          <Ionicons name="bug" size={20} color="#fff" />
          <Text style={styles.createPostButtonText}>Run Diagnostics</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        <View style={[styles.header, { 
          backgroundColor: theme.colors.card,
          borderBottomColor: theme.colors.border,
          paddingTop: insets.top 
        }]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            My Posts (Debug)
          </Text>
          
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
            Loading your posts...
          </Text>
          <Text style={[styles.debugText, { color: theme.colors.secondary }]}>
            {debugInfo}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Header */}
      <View style={[styles.header, { 
        backgroundColor: theme.colors.card,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top 
      }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          My Posts (Debug)
        </Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleCreatePost}
        >
          <Ionicons name="add" size={24} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Posts List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        renderItem={renderPost}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderLoadingFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
        style={styles.flatList}
        contentContainerStyle={[
          styles.flatListContent,
          posts.length === 0 && styles.emptyListContent
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Stats Bar */}
      {posts.length > 0 && (
        <View style={[styles.statsBar, { 
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border 
        }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {posts.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.secondary }]}>
              Posts
            </Text>
          </View>
        </View>
      )}
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerButton: {
    padding: 8,
    marginRight: -8,
  },
  headerRight: {
    width: 40,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    flexGrow: 1,
  },
  emptyListContent: {
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingFooterText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    maxHeight: 150,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    textAlign: 'left',
    fontFamily: 'monospace',
  },
  actionButtons: {
    marginTop: 20,
    gap: 12,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  diagnosticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  createPostButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsBar: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});