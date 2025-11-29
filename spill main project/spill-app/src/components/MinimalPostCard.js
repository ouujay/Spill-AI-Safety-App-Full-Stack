// components/MinimalPostCard.js - Privacy-focused feed card
import React, { memo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image,
  StyleSheet 
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// Safe image URI helper
const safeImageUri = (src) => {
  if (!src) return null;
  const s = String(src).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return src;
};

const MinimalPostCard = memo(({ post, onPress }) => {
  const { theme } = useTheme();
  
  if (!post) return null;

  // Determine most prominent flag with vote count
  const getMostProminentFlag = () => {
    const redVotes = post?.red_votes || 0;
    const greenVotes = post?.green_votes || 0;
    const likes = post?.likes || 0;
    
    if (post?.flag === "red") {
      return { 
        emoji: "🚩", 
        label: "Red Flag", 
        color: "#ef4444", 
        count: redVotes,
        showCount: redVotes > 0
      };
    } else if (post?.flag === "green") {
      return { 
        emoji: "💚", 
        label: "Green Flag", 
        color: "#22c55e", 
        count: greenVotes,
        showCount: greenVotes > 0
      };
    } else if (redVotes > greenVotes && redVotes > 0) {
      return { 
        emoji: "🚩", 
        label: "Red Flag", 
        color: "#ef4444", 
        count: redVotes,
        showCount: true
      };
    } else if (greenVotes > redVotes && greenVotes > 0) {
      return { 
        emoji: "💚", 
        label: "Green Flag", 
        color: "#22c55e", 
        count: greenVotes,
        showCount: true
      };
    } else {
      return { 
        emoji: "🫖", 
        label: "Tea", 
        color: theme.colors.secondary, 
        count: likes,
        showCount: likes > 0
      };
    }
  };

  const imageUri = safeImageUri(post?.image || post?.image_src || post?.image_url);
  const flagInfo = getMostProminentFlag();

  // Extract person's first name from content or use provided first_name
  const getPersonName = () => {
    return post?.first_name || post?.person_name || "Someone";
  };

  // Get university name
  const getUniversityName = () => {
    return post?.university?.name || post?.university || "University";
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { 
        backgroundColor: theme.colors.surface || theme.colors.card,
        borderBottomColor: theme.colors.border,
      }]}
      onPress={() => onPress?.(post)}
      activeOpacity={0.95}
    >
      {/* Person Image - Main Focus */}
      {imageUri ? (
        <Image 
          source={{ uri: imageUri }} 
          style={styles.personImage}
          resizeMode="cover"
          onError={(e) => {
            console.warn("MinimalPostCard image failed:", imageUri, e?.nativeEvent?.error);
          }}
        />
      ) : (
        <View style={[styles.placeholderImage, { backgroundColor: theme.colors.border }]}>
          <Text style={[styles.placeholderText, { color: theme.colors.secondary }]}>
            📸
          </Text>
        </View>
      )}

      {/* Info Overlay */}
      <View style={styles.infoOverlay}>
        {/* Flag Badge - Top Right with Count */}
        <View style={[styles.flagBadge, { backgroundColor: flagInfo.color + 'E6' }]}>
          <Text style={styles.flagEmoji}>{flagInfo.emoji}</Text>
          <Text style={[styles.flagText, { color: '#FFFFFF' }]}>
            {flagInfo.label}
          </Text>
          {flagInfo.showCount && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{flagInfo.count}</Text>
            </View>
          )}
        </View>

        {/* Person Info - Bottom */}
        <View style={styles.personInfoContainer}>
          <Text style={[styles.personName, { color: '#FFFFFF' }]}>
            {getPersonName()}
          </Text>
          <Text style={[styles.universityText, { color: '#FFFFFF' }]}>
            {getUniversityName()}
          </Text>
        </View>
      </View>

      {/* Optional: Vote indicator dots */}
      {(post?.red_votes > 0 || post?.green_votes > 0) && (
        <View style={styles.voteIndicator}>
          {post.red_votes > 0 && (
            <View style={[styles.voteDot, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.voteCount}>{post.red_votes}</Text>
            </View>
          )}
          {post.green_votes > 0 && (
            <View style={[styles.voteDot, { backgroundColor: '#22c55e' }]}>
              <Text style={styles.voteCount}>{post.green_votes}</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
    aspectRatio: 3/4, // Portrait aspect ratio for person images
    minHeight: 300,
  },
  
  personImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
  },

  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    fontSize: 48,
    opacity: 0.5,
  },

  infoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 16,
  },

  flagBadge: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  flagEmoji: {
    fontSize: 16,
    marginRight: 6,
  },

  flagText: {
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },

  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  personInfoContainer: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 'auto',
  },

  personName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  universityText: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  voteIndicator: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },

  voteDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  voteCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

// Set display name for debugging
MinimalPostCard.displayName = 'MinimalPostCard';

export default MinimalPostCard;