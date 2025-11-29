// components/ClickableText.js - Component for making hashtags clickable
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';

export default function ClickableText({ 
  children, 
  style, 
  onHashtagPress,
  highlightHashtags = true,
  ...props 
}) {
  const navigation = useNavigation();
  const { theme } = useTheme();

  // Handle hashtag press
  const handleHashtagPress = (hashtag) => {
    const cleanName = hashtag.replace(/^#/, "").trim();
    if (!cleanName) return;

    if (onHashtagPress) {
      onHashtagPress(cleanName);
    } else {
      navigation.navigate("ExploreList", { 
        type: "hashtag", 
        id: cleanName,
        title: `#${cleanName}` 
      });
    }
  };

  // Parse text and identify hashtags
  const parseTextWithHashtags = (text) => {
    if (!highlightHashtags || typeof text !== 'string') {
      return [{ type: 'text', content: text }];
    }

    // Regex to match hashtags: # followed by alphanumeric characters (including unicode)
    const hashtagRegex = /#[\w\u00C0-\u017F\u0400-\u04FF]+/g;
    const parts = [];
    let lastIndex = 0;

    text.replace(hashtagRegex, (match, index) => {
      // Add text before hashtag
      if (index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, index)
        });
      }
      
      // Add hashtag
      parts.push({
        type: 'hashtag',
        content: match
      });
      
      lastIndex = index + match.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts;
  };

  // Render the parsed text
  const renderParsedText = (text) => {
    const parts = parseTextWithHashtags(text);
    
    return parts.map((part, index) => {
      if (part.type === 'hashtag') {
        return (
          <TouchableOpacity
            key={index}
            onPress={() => handleHashtagPress(part.content)}
            style={{ flexDirection: 'row' }}
          >
            <Text
              style={[
                style,
                {
                  color: theme.colors.accent,
                  fontWeight: '600',
                }
              ]}
            >
              {part.content}
            </Text>
          </TouchableOpacity>
        );
      } else {
        return (
          <Text key={index} style={style}>
            {part.content}
          </Text>
        );
      }
    });
  };

  // Handle different types of children
  if (typeof children === 'string') {
    return (
      <Text style={style} {...props}>
        {renderParsedText(children)}
      </Text>
    );
  }

  // If children is not a string, return as is
  return (
    <Text style={style} {...props}>
      {children}
    </Text>
  );
}

// Higher-order component for wrapping existing Text components
export const withClickableHashtags = (WrappedComponent) => {
  return (props) => {
    const { children, ...otherProps } = props;
    
    if (typeof children === 'string') {
      return (
        <ClickableText {...otherProps}>
          {children}
        </ClickableText>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
};

// Enhanced PostCard Content component with clickable hashtags
export function PostContent({ post, style, onHashtagPress }) {
  const { theme } = useTheme();
  
  return (
    <ClickableText
      style={[
        {
          fontSize: 16,
          lineHeight: 24,
          color: theme.colors.text,
        },
        style
      ]}
      onHashtagPress={onHashtagPress}
      highlightHashtags={true}
    >
      {post.content || post.description || ''}
    </ClickableText>
  );
}