// HomeScreen.js - Updated with sleeker design
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Animated,
  Keyboard,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from "@expo/vector-icons";
import Slider from '@react-native-community/slider';
import { useTheme } from "../theme/ThemeProvider";
import MinimalPostCard from "../components/MinimalPostCard";
import { getFeed } from "../api/posts";
import { getUniversities } from "../api/universities";

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const searchTimeoutRef = useRef(null);
  
  // Core state
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Universities data
  const [universities, setUniversities] = useState([]);
  const [loadingUniversities, setLoadingUniversities] = useState(true);

  // Enhanced Search and Filter State
  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchAnimation] = useState(new Animated.Value(0));
  const [filters, setFilters] = useState({
    university_id: null,
    ageRange: [18, 30],
  });
  const [appliedFilters, setAppliedFilters] = useState({
    name: "",
    university_id: null,
    ageRange: [18, 30],
  });

  // University dropdown state
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);
  const [universitySearchText, setUniversitySearchText] = useState("");

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadInitialFeed();
    loadUniversities();
  }, []);

  // Search focus animation
  useEffect(() => {
    Animated.timing(searchAnimation, {
      toValue: isSearchFocused ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSearchFocused]);

  // Load feed when applied filters change
  useEffect(() => {
    const hasActiveFilters = appliedFilters.name || 
      appliedFilters.university_id || 
      appliedFilters.ageRange[0] !== 18 || 
      appliedFilters.ageRange[1] !== 30;
    
    if (hasActiveFilters) {
      loadInitialFeed();
    }
  }, [appliedFilters]);

  const loadUniversities = async () => {
    try {
      setLoadingUniversities(true);
      console.log('🏫 Loading universities...');
      const universityData = await getUniversities();
      
      let processedData = [];
      if (Array.isArray(universityData)) {
        processedData = universityData;
      } else if (universityData?.results && Array.isArray(universityData.results)) {
        processedData = universityData.results;
      } else if (universityData?.items && Array.isArray(universityData.items)) {
        processedData = universityData.items;
      }
      
      const validUniversities = processedData.filter(uni => 
        uni && typeof uni === 'object' && uni.id && uni.name
      );
      
      setUniversities(validUniversities);
      console.log('🏫 Universities loaded:', validUniversities.length);
      
    } catch (error) {
      console.error("⛔ Error loading universities:", error);
      setUniversities([]);
    } finally {
      setLoadingUniversities(false);
    }
  };

  const loadInitialFeed = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading feed with filters:', appliedFilters);
      
      const params = {
        scope: "for_you",
        page_size: 20,
      };

      if (appliedFilters.name?.trim()) {
        params.name = appliedFilters.name.trim();
      }
      if (appliedFilters.university_id) {
        params.university_id = appliedFilters.university_id;
      }
      if (appliedFilters.ageRange[0] !== 18) {
        params.min_age = appliedFilters.ageRange[0];
      }
      if (appliedFilters.ageRange[1] !== 30) {
        params.max_age = appliedFilters.ageRange[1];
      }

      const response = await getFeed(params);
      const feedItems = response?.items || response?.results || [];
      setPosts(feedItems);
      setNextCursor(response?.next_cursor || null);
      setHasMore(response?.has_more || false);
      
    } catch (error) {
      console.error("⛔ Error loading feed:", error);
      Alert.alert(
        "Connection Error",
        "Failed to load posts. Please check your internet connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!hasMore || isLoading || !nextCursor) return;
    
    try {
      setIsLoading(true);
      const params = {
        scope: "for_you",
        page_size: 20,
        cursor: nextCursor,
      };

      if (appliedFilters.name?.trim()) params.name = appliedFilters.name.trim();
      if (appliedFilters.university_id) params.university_id = appliedFilters.university_id;
      if (appliedFilters.ageRange[0] !== 18) params.min_age = appliedFilters.ageRange[0];
      if (appliedFilters.ageRange[1] !== 30) params.max_age = appliedFilters.ageRange[1];

      const response = await getFeed(params);
      const newItems = response?.items || response?.results || [];
      
      setPosts(prev => [...prev, ...newItems]);
      setNextCursor(response?.next_cursor || null);
      setHasMore(response?.has_more || false);
      
    } catch (error) {
      console.error("⛔ Error loading more posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadInitialFeed();
    setIsRefreshing(false);
  };

  const handlePostPress = useCallback((post) => {
    if (!post?.id) {
      console.warn('Cannot navigate to post without ID');
      return;
    }
    navigation.navigate("PostDetail", { 
      post: post,
      postId: post.id 
    });
  }, [navigation]);

  // Enhanced search with proper debouncing
  const handleSearchTextChange = (text) => {
    setSearchText(text);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (text.trim().length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        const newFilters = { ...appliedFilters, name: text.trim() };
        setAppliedFilters(newFilters);
      }, 500);
    } else if (text.trim().length === 0) {
      const newFilters = { ...appliedFilters, name: "" };
      setAppliedFilters(newFilters);
    }
  };

  const handleSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    const newFilters = { ...appliedFilters, name: searchText.trim() };
    setAppliedFilters(newFilters);
    Keyboard.dismiss();
  };

  const clearSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setSearchText("");
    const newFilters = { ...appliedFilters, name: "" };
    setAppliedFilters(newFilters);
  };

  const applyFilters = () => {
    const newFilters = {
      name: appliedFilters.name,
      university_id: filters.university_id,
      ageRange: [...filters.ageRange],
    };
    setAppliedFilters(newFilters);
    setShowFilters(false);
  };

  const clearAllFilters = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    const resetFilters = {
      name: "",
      university_id: null,
      ageRange: [18, 30],
    };
    setSearchText("");
    setFilters({ university_id: null, ageRange: [18, 30] });
    setAppliedFilters(resetFilters);
    setShowFilters(false);
  };

  const removeFilter = (filterType, value = null) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    switch (filterType) {
      case 'name':
        setSearchText("");
        setAppliedFilters(prev => ({ ...prev, name: "" }));
        break;
      case 'university':
        setFilters(prev => ({ ...prev, university_id: null }));
        setAppliedFilters(prev => ({ ...prev, university_id: null }));
        break;
      case 'age':
        setFilters(prev => ({ ...prev, ageRange: [18, 30] }));
        setAppliedFilters(prev => ({ ...prev, ageRange: [18, 30] }));
        break;
    }
  };

  const filteredUniversities = useMemo(() => {
    if (!Array.isArray(universities) || universities.length === 0) return [];
    
    if (!universitySearchText.trim()) return universities;
    
    const searchTerm = universitySearchText.toLowerCase().trim();
    return universities.filter(uni => 
      uni?.name?.toLowerCase().includes(searchTerm)
    );
  }, [universities, universitySearchText]);

  const getSelectedUniversityName = () => {
    if (!Array.isArray(universities) || !filters.university_id) {
      return "Select University";
    }
    const selected = universities.find(u => u?.id === filters.university_id);
    return selected?.name || "Select University";
  };

  const renderPost = useCallback(({ item, index }) => {
    if (!item) return null;
    
    return (
      <MinimalPostCard
        key={`post-${item.id || index}`}
        post={item}
        onPress={handlePostPress}
      />
    );
  }, [handlePostPress]);

  // Enhanced Active Filters with Beautiful Design
  const renderActiveFilters = () => {
    const hasFilters = appliedFilters.name || 
      appliedFilters.university_id || 
      appliedFilters.ageRange[0] !== 18 || 
      appliedFilters.ageRange[1] !== 30;
    
    if (!hasFilters) return null;

    const getUniversityDisplayName = () => {
      if (!Array.isArray(universities) || !appliedFilters.university_id) return "University";
      const uni = universities.find(u => u?.id === appliedFilters.university_id);
      return uni?.name || "University";
    };

    return (
      <View style={styles.activeFiltersWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.activeFiltersContainer}
          contentContainerStyle={styles.activeFiltersContent}
        >
          {appliedFilters.name && (
            <View 
              style={[
                styles.activeFilterChip, 
                { 
                  backgroundColor: theme.colors.accent + '15',
                  borderColor: theme.colors.accent + '40',
                }
              ]}
            >
              <View style={styles.filterChipContent}>
                <View style={[styles.filterTypeIndicator, { backgroundColor: theme.colors.accent }]}>
                  <Ionicons name="search" size={12} color="#ffffff" />
                </View>
                <View style={styles.filterTextContainer}>
                  <Text style={[styles.filterTypeText, { color: theme.colors.accent }]}>
                    Search
                  </Text>
                  <Text style={[styles.filterValueText, { color: theme.colors.text }]} numberOfLines={1}>
                    "{appliedFilters.name}"
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeFilter('name')}
                style={[styles.removeFilterButton, { backgroundColor: theme.colors.accent + '20' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={14} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>
          )}
          
          {appliedFilters.university_id && (
            <View 
              style={[
                styles.activeFilterChip, 
                { 
                  backgroundColor: theme.colors.accent + '15',
                  borderColor: theme.colors.accent + '40',
                }
              ]}
            >
              <View style={styles.filterChipContent}>
                <View style={[styles.filterTypeIndicator, { backgroundColor: theme.colors.accent }]}>
                  <Ionicons name="school" size={12} color="#ffffff" />
                </View>
                <View style={styles.filterTextContainer}>
                  <Text style={[styles.filterTypeText, { color: theme.colors.accent }]}>
                    University
                  </Text>
                  <Text style={[styles.filterValueText, { color: theme.colors.text }]} numberOfLines={1}>
                    {getUniversityDisplayName()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeFilter('university')}
                style={[styles.removeFilterButton, { backgroundColor: theme.colors.accent + '20' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={14} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>
          )}
          
          {(appliedFilters.ageRange[0] !== 18 || appliedFilters.ageRange[1] !== 30) && (
            <View 
              style={[
                styles.activeFilterChip, 
                { 
                  backgroundColor: theme.colors.accent + '15',
                  borderColor: theme.colors.accent + '40',
                }
              ]}
            >
              <View style={styles.filterChipContent}>
                <View style={[styles.filterTypeIndicator, { backgroundColor: theme.colors.accent }]}>
                  <Ionicons name="calendar" size={12} color="#ffffff" />
                </View>
                <View style={styles.filterTextContainer}>
                  <Text style={[styles.filterTypeText, { color: theme.colors.accent }]}>
                    Age Range
                  </Text>
                  <Text style={[styles.filterValueText, { color: theme.colors.text }]}>
                    {appliedFilters.ageRange[0]}-{appliedFilters.ageRange[1]} years
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => removeFilter('age')}
                style={[styles.removeFilterButton, { backgroundColor: theme.colors.accent + '20' }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={14} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>
          )}

          {/* Clear All Button */}
          <TouchableOpacity
            onPress={clearAllFilters}
            style={[styles.clearAllButton, { 
              backgroundColor: theme.colors.secondary + '15',
              borderColor: theme.colors.secondary + '30',
            }]}
          >
            <Text style={[styles.clearAllText, { color: theme.colors.secondary }]}>
              Clear All
            </Text>
            <Ionicons name="trash-outline" size={14} color={theme.colors.secondary} />
          </TouchableOpacity>
        </ScrollView>
        
        {/* Filter Summary */}
        <View style={styles.filterSummary}>
          <Text style={[styles.filterSummaryText, { color: theme.colors.secondary }]}>
            {posts.length} posts found
          </Text>
        </View>
      </View>
    );
  };

  const renderLoadingFooter = () => {
    if (!isLoading || posts.length === 0) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.colors.accent} />
        <Text style={[styles.loadingFooterText, { color: theme.colors.secondary }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search" size={64} color={theme.colors.secondary} />
      <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
        No posts found
      </Text>
      <Text style={[styles.emptyStateSubtitle, { color: theme.colors.secondary }]}>
        Try adjusting your search or filters
      </Text>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFilters(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.primary }]} edges={['top']}>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} backgroundColor={theme.colors.primary} />
        
        {/* Modal Header */}
        <View style={[styles.modalHeader, { 
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }]}>
          <TouchableOpacity onPress={() => setShowFilters(false)}>
            <Text style={[styles.modalCancel, { color: theme.colors.secondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Filters
          </Text>
          <TouchableOpacity onPress={clearAllFilters}>
            <Text style={[styles.modalClear, { color: theme.colors.accent }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.modalContent, { backgroundColor: theme.colors.primary }]}>
          {/* University Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
              University
            </Text>
            
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }
              ]}
              onPress={() => setShowUniversityDropdown(!showUniversityDropdown)}
            >
              <Text style={[
                styles.dropdownButtonText,
                { 
                  color: filters.university_id ? theme.colors.text : theme.colors.secondary 
                }
              ]}>
                {getSelectedUniversityName()}
              </Text>
              <Ionicons 
                name={showUniversityDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={theme.colors.secondary} 
              />
            </TouchableOpacity>

            {showUniversityDropdown && (
              <View style={[styles.dropdown, { 
                backgroundColor: theme.colors.card, 
                borderColor: theme.colors.border,
              }]}>
                <TextInput
                  style={[
                    styles.dropdownSearch,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text,
                    }
                  ]}
                  value={universitySearchText}
                  onChangeText={setUniversitySearchText}
                  placeholder="Search universities..."
                  placeholderTextColor={theme.colors.secondary}
                />

                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[
                      styles.dropdownItem,
                      {
                        backgroundColor: !filters.university_id ? theme.colors.accent + '20' : 'transparent'
                      }
                    ]}
                    onPress={() => {
                      setFilters(prev => ({ ...prev, university_id: null }));
                      setShowUniversityDropdown(false);
                      setUniversitySearchText("");
                    }}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      { 
                        color: !filters.university_id ? theme.colors.accent : theme.colors.text,
                        fontWeight: !filters.university_id ? '600' : '400'
                      }
                    ]}>
                      All Universities
                    </Text>
                  </TouchableOpacity>

                  {!loadingUniversities && Array.isArray(universities) ? (
                    filteredUniversities.map((uni) => (
                      <TouchableOpacity
                        key={uni?.id || Math.random()}
                        style={[
                          styles.dropdownItem,
                          {
                            backgroundColor: filters.university_id === uni?.id ? theme.colors.accent + '20' : 'transparent'
                          }
                        ]}
                        onPress={() => {
                          setFilters(prev => ({ ...prev, university_id: uni?.id }));
                          setShowUniversityDropdown(false);
                          setUniversitySearchText("");
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          { 
                            color: filters.university_id === uni?.id ? theme.colors.accent : theme.colors.text,
                            fontWeight: filters.university_id === uni?.id ? '600' : '400'
                          }
                        ]}>
                          {uni?.name || 'Unknown University'}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    !loadingUniversities && (
                      <View style={styles.dropdownEmpty}>
                        <Text style={[styles.dropdownEmptyText, { color: theme.colors.secondary }]}>
                          No universities available
                        </Text>
                      </View>
                    )
                  )}

                  {!loadingUniversities && filteredUniversities.length === 0 && universitySearchText && (
                    <View style={styles.dropdownEmpty}>
                      <Text style={[styles.dropdownEmptyText, { color: theme.colors.secondary }]}>
                        No universities found
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Age Range Filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: theme.colors.text }]}>
              Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}
            </Text>
            
            <View style={[styles.sliderContainer, { 
              backgroundColor: theme.colors.surface,
              borderRadius: 12,
              padding: 16,
              marginTop: 8,
            }]}>
              <Text style={[styles.sliderLabel, { color: theme.colors.secondary }]}>18</Text>
              <View style={styles.sliderWrapper}>
                <Text style={[styles.sliderValue, { color: theme.colors.text }]}>
                  Min: {filters.ageRange[0]}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={18}
                  maximumValue={30}
                  value={filters.ageRange[0]}
                  onValueChange={(value) => {
                    const newMin = Math.round(value);
                    setFilters(prev => ({ 
                      ...prev, 
                      ageRange: [newMin, Math.max(newMin, prev.ageRange[1])]
                    }));
                  }}
                  minimumTrackTintColor={theme.colors.accent}
                  maximumTrackTintColor={theme.colors.border}
                  thumbStyle={{ backgroundColor: theme.colors.accent }}
                  step={1}
                />
                
                <Text style={[styles.sliderValue, { color: theme.colors.text }]}>
                  Max: {filters.ageRange[1]}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={18}
                  maximumValue={30}
                  value={filters.ageRange[1]}
                  onValueChange={(value) => {
                    const newMax = Math.round(value);
                    setFilters(prev => ({ 
                      ...prev, 
                      ageRange: [Math.min(prev.ageRange[0], newMax), newMax]
                    }));
                  }}
                  minimumTrackTintColor={theme.colors.accent}
                  maximumTrackTintColor={theme.colors.border}
                  thumbStyle={{ backgroundColor: theme.colors.accent }}
                  step={1}
                />
              </View>
              <Text style={[styles.sliderLabel, { color: theme.colors.secondary }]}>30+</Text>
            </View>
          </View>
        </ScrollView>

        {/* Apply Button */}
        <View style={[styles.modalFooter, { 
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        }]}>
          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: theme.colors.accent }]}
            onPress={applyFilters}
            activeOpacity={0.8}
          >
            <Text style={[styles.applyButtonText, { color: '#ffffff' }]}>
              Apply Filters
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
  
  if (isLoading && posts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} backgroundColor={theme.colors.background} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Loading posts...
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} backgroundColor={theme.colors.background} />
      
      {/* Enhanced Header - Extends to cover status bar */}
      <SafeAreaView style={[styles.headerSafeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={[styles.header, { 
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.border,
        }]}>
          {/* Logo on the left */}
          <TouchableOpacity 
            style={styles.logoContainer}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../assets/logo4.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          
          {/* Search Bar and Filter Button - Below logo */}
          <View style={styles.searchContainer}>
            <Animated.View 
              style={[
                styles.searchInputContainer, 
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: searchAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [theme.colors.border, theme.colors.accent],
                  }),
                  borderWidth: searchAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 2],
                  }),
                }
              ]}
            >
              <Ionicons 
                name="search" 
                size={18} 
                color={theme.colors.text} 
              />
              
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                value={searchText}
                onChangeText={handleSearchTextChange}
                placeholder="Search by name"
                placeholderTextColor={theme.colors.text + '80'}
                onSubmitEditing={handleSearch}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                returnKeyType="search"
              />
              
              {searchText.length > 0 && (
                <TouchableOpacity 
                  onPress={clearSearch}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={theme.colors.text} />
                </TouchableOpacity>
              )}
            </Animated.View>
            
            {/* Sleeker Filter Button */}
            <TouchableOpacity 
              style={[
                styles.filterButton, 
                { 
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }
              ]}
              onPress={() => setShowFilters(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="options-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Beautiful Active Filters */}
      {renderActiveFilters()}

      {/* Posts Feed */}
      <FlatList
        data={posts}
        keyExtractor={(item, index) => `post-${item?.id || index}`}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
            progressBackgroundColor={theme.colors.surface}
          />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.1}
        contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderLoadingFooter}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={50}
        initialNumToRender={3}
        windowSize={10}
      />

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header styles - Extended to cover status bar
  headerSafeArea: {
    paddingBottom: 0,
  },
  
  header: { 
    flexDirection: 'column',
    paddingHorizontal: 16, 
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  
  logoContainer: {
    padding: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  
  logo: {
    width: 40,
    height: 40,
  },

  // Sleeker Search styles
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 8,
    height: 40,
    overflow: 'visible',
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
  },

  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Beautiful Active Filters Styles
  activeFiltersWrapper: {
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingTop: 12,
  },

  activeFiltersContainer: {
    paddingHorizontal: 16,
  },

  activeFiltersContent: {
    gap: 10,
    paddingRight: 16,
  },

  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 140,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  filterChipContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  filterTypeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  filterTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 12,
  },

  filterValueText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },

  removeFilterButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },

  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
  },

  filterSummary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },

  filterSummaryText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Modal styles
  modalContainer: { flex: 1 },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },

  modalCancel: { 
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
  },
  modalClear: { 
    fontSize: 16, 
    fontWeight: '600',
  },

  modalContent: { 
    flex: 1, 
    padding: 20,
  },

  filterSection: { 
    marginBottom: 32,
  },

  filterLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 12,
  },

  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },

  dropdownButtonText: { 
    fontSize: 16,
  },

  dropdown: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 220,
    overflow: 'hidden',
  },

  dropdownSearch: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    fontSize: 16,
  },

  dropdownList: { 
    maxHeight: 180,
  },

  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },

  dropdownItemText: { 
    fontSize: 16,
  },

  dropdownEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  dropdownEmptyText: { 
    fontSize: 14,
    fontStyle: 'italic',
  },

  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  sliderWrapper: { 
    flex: 1,
  },
  
  slider: { 
    width: '100%', 
    height: 40,
    marginVertical: 6,
  },

  sliderLabel: { 
    fontSize: 14, 
    minWidth: 35, 
    textAlign: 'center',
    fontWeight: '500',
  },
  sliderValue: { 
    fontSize: 14, 
    textAlign: 'center', 
    marginVertical: 6,
    fontWeight: '600',
  },

  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
  },

  applyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  // List styles
  listContainer: { paddingBottom: 20 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyStateTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 8,
    marginTop: 16,
  },
  emptyStateSubtitle: { 
    fontSize: 16, 
    textAlign: 'center',
    lineHeight: 22,
  },
  
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 16, 
    fontSize: 16 
  },
  
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingFooterText: { 
    fontSize: 14 
  },
});