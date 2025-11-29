// screens/SearchScreen.js - UPDATED WITH SLIM SEARCH BAR
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeProvider";
import { searchPosts, getTrendingHashtags } from "../api/api";
import MinimalPostCard from "../components/MinimalPostCard";
import { useNavigation } from "@react-navigation/native";

const { width: screenWidth } = Dimensions.get("window");

const TABS = [
  { key: "all", label: "All", icon: "apps" },
  { key: "posts", label: "Posts", icon: "document-text" },
  { key: "university", label: "Universities", icon: "school" },
  { key: "hashtags", label: "Hashtags", icon: "pricetag" },
];

export default function SearchScreen() {
  const { theme } = useTheme();
  const nav = useNavigation();

  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(false);
  const [mixedResults, setMixedResults] = useState([]);
  const [list, setList] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trendingTags, setTrendingTags] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  const timerRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    setRecentSearches(["University of Lagos", "#exams", "roommate tips"]);
    fetchTrendingHashtags();
  }, []);

  const fetchTrendingHashtags = async () => {
    try {
      setLoadingTrending(true);
      console.log('Fetching real trending hashtags from backend...');
      
      const trending = await getTrendingHashtags(8, 7);
      console.log('Trending hashtags received:', trending);
      
      const formattedTags = Array.isArray(trending) ? trending.map(tag => {
        const name = tag.name || tag.hashtag || tag;
        const cleanName = name.toString().replace(/^#+/, "").trim();
        return `#${cleanName}`;
      }) : [];
      
      setTrendingTags(formattedTags);
      console.log('Formatted trending tags:', formattedTags);
    } catch (error) {
      console.log('Failed to fetch trending hashtags:', error);
      setTrendingTags([]);
    } finally {
      setLoadingTrending(false);
    }
  };

  useEffect(() => {
    if (mixedResults.length || list.length) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          speed: 14,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [mixedResults, list]);

  const runSearch = useCallback(
    async (query, type = tab) => {
      if (!query.trim()) {
        setMixedResults([]);
        setList([]);
        setShowSuggestions(false);
        return;
      }

      setLoading(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(-10);

      try {
        console.log(`Searching for: "${query}" with type: "${type}"`);
        
        const data = await searchPosts(query, type);
        console.log('Search results:', data);

        if (type === "all") {
          // Mix all results together preserving order
          const mixed = [];
          const postsArray = data?.posts || [];
          const peopleArray = data?.people || [];
          const posts = (postsArray.length > 0) ? postsArray : peopleArray;
          const universities = Array.isArray(data?.universities) ? data.universities : [];
          const hashtags = Array.isArray(data?.hashtags) ? data.hashtags : [];

          console.log('Posts found:', posts.length, posts);
          console.log('Universities found:', universities.length);
          console.log('Hashtags found:', hashtags.length);

          posts.forEach(item => mixed.push({ ...item, _type: 'post' }));
          universities.forEach(item => mixed.push({ ...item, _type: 'university' }));
          hashtags.forEach(item => mixed.push({ ...item, _type: 'hashtag' }));

          console.log('Mixed results:', mixed.length, mixed);
          setMixedResults(mixed);
        } else {
          let results = [];
          
          if (type === "posts") {
            const postsArray = data?.posts || [];
            const peopleArray = data?.people || [];
            results = (postsArray.length > 0) ? postsArray : peopleArray;
          } else if (type === "university") {
            results = data?.universities || [];
          } else if (type === "hashtags") {
            results = data?.hashtags || [];
          } else {
            results = data?.results || [];
          }
          
          console.log('Tab results for', type, ':', results.length, results);
          setList(Array.isArray(results) ? results : []);
        }
        setShowSuggestions(false);
      } catch (e) {
        console.log("Search error:", e);
        setMixedResults([]);
        setList([]);
      } finally {
        setLoading(false);
      }
    },
    [tab, fadeAnim, slideAnim]
  );

  const onChange = (text) => {
    setQ(text);
    setShowSuggestions(text.length > 0 && text.length < 3);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(text, tab), 350);
  };

  const onSubmit = () => {
    runSearch(q, tab);
    if (q.trim() && !recentSearches.includes(q)) {
      setRecentSearches([q, ...recentSearches.slice(0, 4)]);
    }
  };

  const handleQuickSearch = (term) => {
    setQ(term);
    runSearch(term, "all");
  };

  const handlePostPress = (post) => {
    if (!post?.id) {
      console.warn('Cannot navigate to post without ID');
      return;
    }
    console.log("Post pressed:", post);
    nav.navigate("PostDetail", { 
      post: post,
      postId: post.id 
    });
  };

  const handleHashtagPress = (hashtag) => {
    const name = hashtag?.name || hashtag;
    if (!name) {
      console.warn("Cannot navigate: hashtag name is undefined");
      return;
    }
    
    const cleanName = name.toString().replace(/^#+/, "").trim();
    if (!cleanName) {
      console.warn("Cannot navigate: hashtag name is empty after cleaning");
      return;
    }
    
    console.log(`Navigating to hashtag: "${cleanName}"`);
    
    nav.navigate("ExploreList", { 
      type: "hashtag", 
      id: cleanName,
      title: `#${cleanName}` 
    });
  };

  const handleUniversityPress = (university) => {
    const id = university?.id;
    if (!id) {
      console.warn("Cannot navigate: university ID is undefined");
      return;
    }
    
    nav.navigate("ExploreList", { 
      type: "university", 
      id: id,
      title: university?.name || `University ${id}`,
      university: university
    });
  };

  const renderHashtagItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleHashtagPress(item)}
      style={[styles.hashtagItem, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.hashtagIcon, { backgroundColor: theme.colors.accent + "20" }]}>
        <Ionicons name="pricetag" size={16} color={theme.colors.accent} />
      </View>
      <View style={styles.hashtagInfo}>
        <Text style={[styles.hashtagName, { color: theme.colors.text }]}>
          {item?.name || item}
        </Text>
        {item?.count !== undefined && (
          <Text style={[styles.hashtagCount, { color: theme.colors.secondary }]}>
            {item.count} posts
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderUniversityItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleUniversityPress(item)}
      style={[styles.universityItem, { backgroundColor: theme.colors.surface }]}
    >
      <View style={[styles.universityIcon, { backgroundColor: theme.colors.accent + "20" }]}>
        <Ionicons name="school" size={16} color={theme.colors.accent} />
      </View>
      <View style={styles.universityInfo}>
        <Text style={[styles.universityName, { color: theme.colors.text }]}>
          {item?.name || "Unknown University"}
        </Text>
        {item?.city && (
          <Text style={[styles.universityLocation, { color: theme.colors.secondary }]}>
            {item.city.name}{item?.city?.country ? `, ${item.city.country.name}` : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPostItem = ({ item }) => (
    <MinimalPostCard post={item} onPress={handlePostPress} />
  );

  const renderMixedItem = ({ item }) => {
    if (item._type === 'post') {
      return renderPostItem({ item });
    } else if (item._type === 'hashtag') {
      return renderHashtagItem({ item });
    } else if (item._type === 'university') {
      return renderUniversityItem({ item });
    }
    return null;
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.secondary }]}>
            Searching...
          </Text>
        </View>
      );
    }

    const dataToRender = tab === "all" ? mixedResults : list;

    return (
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <FlatList
          data={dataToRender}
          keyExtractor={(item, index) => `${tab}-${item?.id || item?.name || index}`}
          renderItem={tab === "all" ? renderMixedItem : (
            tab === "posts" ? renderPostItem :
            tab === "hashtags" ? renderHashtagItem :
            tab === "university" ? renderUniversityItem : 
            renderPostItem
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            q ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={48} color={theme.colors.secondary} />
                <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
                  No results found for "{q}"
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.secondary }]}>
                  Try different keywords or check spelling
                </Text>
              </View>
            ) : null
          }
          numColumns={1}
        />
      </Animated.View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      {trendingTags.length > 0 && (
        <View style={styles.trendingSection}>
          <View style={styles.trendingSectionHeader}>
            <Text style={[styles.trendingTitle, { color: theme.colors.text }]}>
              Trending Now
            </Text>
            {loadingTrending && (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            )}
            <TouchableOpacity
              onPress={fetchTrendingHashtags}
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={16} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingTags}
          >
            {trendingTags.map((tag, index) => (
              <TouchableOpacity
                key={`trending-${index}`}
                onPress={() => handleQuickSearch(tag)}
                style={[styles.trendingTag, { backgroundColor: theme.colors.surface }]}
              >
                <Text style={[styles.trendingTagText, { color: theme.colors.accent }]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {recentSearches.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={[styles.recentTitle, { color: theme.colors.text }]}>
            Recent Searches
          </Text>
          {recentSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleQuickSearch(search)}
              style={styles.recentItem}
            >
              <Ionicons name="time-outline" size={18} color={theme.colors.secondary} />
              <Text style={[styles.recentText, { color: theme.colors.text }]}>{search}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="search" size={18} color={theme.colors.text} />
            <TextInput
              value={q}
              onChangeText={onChange}
              onSubmitEditing={onSubmit}
              placeholder="Search posts, universities, hashtags..."
              placeholderTextColor={theme.colors.text + '80'}
              style={[styles.input, { color: theme.colors.text }]}
              returnKeyType="search"
              autoCapitalize="none"
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => { setQ(""); setMixedResults([]); setList([]); }}>
                <Ionicons name="close-circle" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.tabsContainer, { backgroundColor: theme.colors.primary }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => {
                  setTab(t.key);
                  if (q) runSearch(q, t.key);
                }}
                style={[
                  styles.tab,
                  { backgroundColor: tab === t.key ? theme.colors.accent : theme.colors.surface },
                ]}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={tab === t.key ? "#fff" : theme.colors.text}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: tab === t.key ? "#fff" : theme.colors.text },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.content}>
          {q ? renderTabContent() : renderEmptyState()}
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 8,
    height: 40,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "400",
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 100,
  },
  hashtagItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  hashtagIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  hashtagInfo: {
    flex: 1,
  },
  hashtagName: {
    fontSize: 16,
    fontWeight: "500",
  },
  hashtagCount: {
    fontSize: 12,
    marginTop: 2,
  },
  universityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  universityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  universityInfo: {
    flex: 1,
  },
  universityName: {
    fontSize: 16,
    fontWeight: "500",
  },
  universityLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  emptyStateContainer: {
    flex: 1,
    paddingTop: 20,
  },
  trendingSection: {
    marginBottom: 32,
  },
  trendingSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  trendingTitle: {
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
  },
  refreshButton: {
    padding: 4,
  },
  trendingTags: {
    paddingRight: 16,
  },
  trendingTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  trendingTagText: {
    fontSize: 14,
    fontWeight: "500",
  },
  recentSection: {
    marginBottom: 32,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  recentText: {
    fontSize: 16,
  },
});