// components/FollowButton.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { 
  followUser, 
  unfollowUser, 
  followHashtag, 
  unfollowHashtag, 
  followUniversity, 
  unfollowUniversity,
  getFollowStatus 
} from '../api/notifications';

export default function FollowButton({ 
  type, // 'user', 'hashtag', or 'university'
  id, // user ID, hashtag name, or university ID
  name, // Display name (optional)
  onFollowChange, // Callback when follow status changes
  style,
  textStyle,
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
}) {
  const { theme } = useTheme();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check initial follow status
  useEffect(() => {
    checkFollowStatus();
  }, [type, id]);

  const checkFollowStatus = async () => {
    try {
      setCheckingStatus(true);
      
      let params = {};
      if (type === 'user') {
        params.user_ids = [id];
      } else if (type === 'hashtag') {
        // FIXED: Clean the hashtag name before checking
        const cleanName = (id || "").toString().replace(/^#+/, "").trim();
        params.hashtag_names = [cleanName];
      } else if (type === 'university') {
        params.university_ids = [id];
      }
      
      const status = await getFollowStatus(params);
      
      let following = false;
      if (type === 'user' && status.users) {
        following = status.users[id] || false;
      } else if (type === 'hashtag' && status.hashtags) {
        // FIXED: Use cleaned name for hashtag lookup
        const cleanName = (id || "").toString().replace(/^#+/, "").trim();
        following = status.hashtags[cleanName] || false;
      } else if (type === 'university' && status.universities) {
        following = status.universities[id] || false;
      }
      
      setIsFollowing(following);
    } catch (error) {
      console.error('Error checking follow status:', error);
      // Don't show error to user, just assume not following
      setIsFollowing(false);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleFollowToggle = async () => {
    if (loading || disabled) return;
    
    try {
      setLoading(true);
      
      let result;
      if (isFollowing) {
        // Unfollow
        if (type === 'user') {
          result = await unfollowUser(id);
        } else if (type === 'hashtag') {
          // FIXED: Clean hashtag name before sending
          const cleanName = (id || "").toString().replace(/^#+/, "").trim();
          result = await unfollowHashtag(cleanName);
        } else if (type === 'university') {
          result = await unfollowUniversity(id);
        }
      } else {
        // Follow
        if (type === 'user') {
          result = await followUser(id);
        } else if (type === 'hashtag') {
          // FIXED: Clean hashtag name before sending
          const cleanName = (id || "").toString().replace(/^#+/, "").trim();
          result = await followHashtag(cleanName);
        } else if (type === 'university') {
          result = await followUniversity(id);
        }
      }
      
      const newFollowStatus = !isFollowing;
      setIsFollowing(newFollowStatus);
      
      // Call callback if provided
      if (onFollowChange) {
        onFollowChange(newFollowStatus);
      }
      
      console.log('Follow toggle successful:', result);
      
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert(
        'Error',
        `Failed to ${isFollowing ? 'unfollow' : 'follow'}. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (checkingStatus) return '...';
    if (loading) return isFollowing ? 'Unfollowing...' : 'Following...';
    return isFollowing ? 'Following' : 'Follow';
  };

  const getButtonIcon = () => {
    if (checkingStatus || loading) return null;
    
    if (isFollowing) {
      return 'checkmark';
    } else {
      if (type === 'user') return 'person-add';
      if (type === 'hashtag') return 'pricetag';
      if (type === 'university') return 'school';
    }
    return 'add';
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          button: { paddingHorizontal: 12, paddingVertical: 6 },
          text: { fontSize: 12 },
          icon: 14,
        };
      case 'large':
        return {
          button: { paddingHorizontal: 24, paddingVertical: 12 },
          text: { fontSize: 16 },
          icon: 20,
        };
      default: // medium
        return {
          button: { paddingHorizontal: 16, paddingVertical: 8 },
          text: { fontSize: 14 },
          icon: 16,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const icon = getButtonIcon();

  if (checkingStatus) {
    return (
      <TouchableOpacity 
        style={[
          styles.button, 
          sizeStyles.button,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          style
        ]}
        disabled
      >
        <ActivityIndicator size="small" color={theme.colors.secondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        sizeStyles.button,
        {
          backgroundColor: isFollowing 
            ? theme.colors.surface 
            : theme.colors.accent,
          borderColor: isFollowing 
            ? theme.colors.accent 
            : 'transparent',
          borderWidth: isFollowing ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        style
      ]}
      onPress={handleFollowToggle}
      disabled={loading || checkingStatus || disabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={isFollowing ? theme.colors.accent : '#FFFFFF'} 
        />
      ) : (
        <>
          {icon && (
            <Ionicons 
              name={icon} 
              size={sizeStyles.icon} 
              color={isFollowing ? theme.colors.accent : '#FFFFFF'} 
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            style={[
              styles.buttonText,
              sizeStyles.text,
              {
                color: isFollowing ? theme.colors.accent : '#FFFFFF'
              },
              textStyle
            ]}
          >
            {getButtonText()}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    minWidth: 80,
  },
  buttonText: {
    fontWeight: '600',
  },
});