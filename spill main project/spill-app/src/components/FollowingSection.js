// components/FollowingSection.js - Following section for profile page
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { getUserFollowing } from '../api/notifications';
import FollowButton from './FollowButton';

export default function FollowingSection({ userId, style }) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [following, setFollowing] = useState({
    users: [],
    hashtags: [],
    universities: [],
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [counts, setCounts] = useState({
    users: 0,
    hashtags: 0,
    universities: 0,
  });

  useEffect(() => {
    loadFollowingData();
  }, [userId]);

  const loadFollowingData = async () => {
    try {
      setLoading(true);
      const data = await getUserFollowing(userId);
      
      setFollowing({
        users: data.users || [],
        hashtags: data.hashtags || [],
        universities: data.universities || [],
      });
      
      setCounts({
        users: data.users?.length || 0,
        hashtags: data.hashtags?.length || 0,
        universities: data.universities?.length || 0,
      });
    } catch (error) {
      console.error('Error loading following data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (tab = 'users') => {
    setActiveTab(tab);
    setShowModal(true);
  };

  const handleUserPress = (user) => {
    setShowModal(false);
    navigation.navigate('Profile', { userId: user.id });
  };

  const handleHashtagPress = (hashtag) => {
    setShowModal(false);
    navigation.navigate('ExploreList', {
      type: 'hashtag',
      id: hashtag.name,
      title: `#${hashtag.name}`,
    });
  };

  const handleUniversityPress = (university) => {
    setShowModal(false);
    navigation.navigate('ExploreList', {
      type: 'university',
      id: university.id,
      title: university.name,
      university: university,
    });
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.followingItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleUserPress(item)}
    >
      <Image
        source={{ 
          uri: item.profile_picture || `https://ui-avatars.com/api/?name=${item.first_name}&background=random` 
        }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.colors.text }]}>
          {item.first_name} {item.last_name}
        </Text>
        {item.university && (
          <Text style={[styles.userUniversity, { color: theme.colors.secondary }]}>
            {item.university.name}
          </Text>
        )}
      </View>
      <FollowButton
        type="user"
        id={item.id}
        size="small"
        onFollowChange={() => {
          // Optionally refresh the data
          loadFollowingData();
        }}
      />
    </TouchableOpacity>
  );

  const renderHashtagItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.followingItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleHashtagPress(item)}
    >
      <View style={[styles.hashtagIcon, { backgroundColor: theme.colors.accent + '20' }]}>
        <Ionicons name="pricetag" size={20} color={theme.colors.accent} />
      </View>
      <View style={styles.hashtagInfo}>
        <Text style={[styles.hashtagName, { color: theme.colors.text }]}>
          #{item.name}
        </Text>
        {item.post_count && (
          <Text style={[styles.hashtagCount, { color: theme.colors.secondary }]}>
            {item.post_count.toLocaleString()} posts
          </Text>
        )}
      </View>
      <FollowButton
        type="hashtag"
        id={item.name}
        size="small"
        onFollowChange={() => {
          loadFollowingData();
        }}
      />
    </TouchableOpacity>
  );

  const renderUniversityItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.followingItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleUniversityPress(item)}
    >
      <View style={[styles.universityIcon, { backgroundColor: theme.colors.accent + '20' }]}>
        <Ionicons name="school" size={20} color={theme.colors.accent} />
      </View>
      <View style={styles.universityInfo}>
        <Text style={[styles.universityName, { color: theme.colors.text }]}>
          {item.name}
        </Text>
        {item.city && (
          <Text style={[styles.universityLocation, { color: theme.colors.secondary }]}>
            {item.city.name}{item.city.country && `, ${item.city.country.name}`}
          </Text>
        )}
      </View>
      <FollowButton
        type="university"
        id={item.id}
        size="small"
        onFollowChange={() => {
          loadFollowingData();
        }}
      />
    </TouchableOpacity>
  );

  const getActiveData = () => {
    switch (activeTab) {
      case 'users':
        return following.users;
      case 'hashtags':
        return following.hashtags;
      case 'universities':
        return following.universities;
      default:
        return [];
    }
  };

  const getActiveRenderItem = () => {
    switch (activeTab) {
      case 'users':
        return renderUserItem;
      case 'hashtags':
        return renderHashtagItem;
      case 'universities':
        return renderUniversityItem;
      default:
        return renderUserItem;
    }
  };

  const totalFollowing = counts.users + counts.hashtags + counts.universities;

  if (totalFollowing === 0 && !loading) {
    return null; // Don't show section if not following anyone
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Following</Text>
          <Text style={[styles.totalCount, { color: theme.colors.secondary }]}>
            {totalFollowing}
          </Text>
        </View>
        
        <View style={styles.countsRow}>
          <TouchableOpacity
            style={styles.countItem}
            onPress={() => openModal('users')}
            disabled={counts.users === 0}
          >
            <Text style={[styles.countNumber, { color: theme.colors.text }]}>
              {counts.users}
            </Text>
            <Text style={[styles.countLabel, { color: theme.colors.secondary }]}>
              Users
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.countItem}
            onPress={() => openModal('hashtags')}
            disabled={counts.hashtags === 0}
          >
            <Text style={[styles.countNumber, { color: theme.colors.text }]}>
              {counts.hashtags}
            </Text>
            <Text style={[styles.countLabel, { color: theme.colors.secondary }]}>
              Hashtags
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.countItem}
            onPress={() => openModal('universities')}
            disabled={counts.universities === 0}
          >
            <Text style={[styles.countNumber, { color: theme.colors.text }]}>
              {counts.universities}
            </Text>
            <Text style={[styles.countLabel, { color: theme.colors.secondary }]}>
              Universities
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Following Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.primary }}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Following
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Tabs */}
          <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'users' && { borderBottomColor: theme.colors.accent }
              ]}
              onPress={() => setActiveTab('users')}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'users' ? theme.colors.accent : theme.colors.secondary }
              ]}>
                Users ({counts.users})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'hashtags' && { borderBottomColor: theme.colors.accent }
              ]}
              onPress={() => setActiveTab('hashtags')}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'hashtags' ? theme.colors.accent : theme.colors.secondary }
              ]}>
                Hashtags ({counts.hashtags})
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'universities' && { borderBottomColor: theme.colors.accent }
              ]}
              onPress={() => setActiveTab('universities')}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === 'universities' ? theme.colors.accent : theme.colors.secondary }
              ]}>
                Universities ({counts.universities})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <FlatList
            data={getActiveData()}
            renderItem={getActiveRenderItem()}
            keyExtractor={(item) => 
              activeTab === 'users' ? item.id?.toString() :
              activeTab === 'hashtags' ? item.name :
              item.id?.toString()
            }
            style={styles.modalList}
            contentContainerStyle={styles.modalListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons 
                  name={
                    activeTab === 'users' ? 'people' :
                    activeTab === 'hashtags' ? 'pricetag' : 'school'
                  } 
                  size={48} 
                  color={theme.colors.secondary} 
                />
                <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
                  No {activeTab} followed yet
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  countItem: {
    alignItems: 'center',
    flex: 1,
  },
  countNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  countLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  
  // Modal styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalList: {
    flex: 1,
  },
  modalListContent: {
    padding: 16,
  },
  
  // List item styles
  followingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  
  // User styles
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userUniversity: {
    fontSize: 12,
  },
  
  // Hashtag styles
  hashtagIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hashtagInfo: {
    flex: 1,
  },
  hashtagName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  hashtagCount: {
    fontSize: 12,
  },
  
  // University styles
  universityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  universityInfo: {
    flex: 1,
  },
  universityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  universityLocation: {
    fontSize: 12,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});