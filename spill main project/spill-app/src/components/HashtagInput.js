// components/HashtagInput.js - Advanced hashtag input with autocomplete
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { searchHashtags } from '../api/search';

export default function HashtagInput({
  value,
  onChangeText,
  placeholder = "What's happening?",
  style,
  multiline = true,
  maxLength = 1000,
  ...props
}) {
  const { theme } = useTheme();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentHashtag, setCurrentHashtag] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isTypingHashtag, setIsTypingHashtag] = useState(false);
  const inputRef = useRef(null);

  // Search for hashtag suggestions
  const searchHashtagSuggestions = async (query) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      const results = await searchHashtags(query);
      // Sort by popularity (post count)
      const sortedResults = results.sort((a, b) => (b.post_count || 0) - (a.post_count || 0));
      setSuggestions(sortedResults.slice(0, 8)); // Show top 8 suggestions
    } catch (error) {
      console.error('Error searching hashtags:', error);
      setSuggestions([]);
    }
  };

  // Detect if user is typing a hashtag
  useEffect(() => {
    const text = value || '';
    const beforeCursor = text.substring(0, cursorPosition);
    
    // Find the last # symbol before cursor
    const lastHashIndex = beforeCursor.lastIndexOf('#');
    
    if (lastHashIndex !== -1) {
      // Check if there's a space or newline after the # and before cursor
      const afterHash = beforeCursor.substring(lastHashIndex + 1);
      const hasSpaceOrNewline = /[\s\n]/.test(afterHash);
      
      if (!hasSpaceOrNewline) {
        // User is typing a hashtag
        setIsTypingHashtag(true);
        setCurrentHashtag(afterHash);
        setShowSuggestions(true);
        
        // Search for suggestions
        if (afterHash.length > 0) {
          searchHashtagSuggestions(afterHash);
        } else {
          // Show trending hashtags when just typing #
          getTrendingHashtags();
        }
      } else {
        setIsTypingHashtag(false);
        setShowSuggestions(false);
      }
    } else {
      setIsTypingHashtag(false);
      setShowSuggestions(false);
    }
  }, [value, cursorPosition]);

  // Get trending hashtags for suggestions
  const getTrendingHashtags = async () => {
    try {
      const trending = await searchHashtags('', { trending: true, limit: 6 });
      setSuggestions(trending);
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      setSuggestions([]);
    }
  };

  // Handle hashtag selection
  const selectHashtag = (hashtag) => {
    const text = value || '';
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // Find the position of the current hashtag being typed
    const lastHashIndex = beforeCursor.lastIndexOf('#');
    
    if (lastHashIndex !== -1) {
      const beforeHash = text.substring(0, lastHashIndex);
      const newText = beforeHash + `#${hashtag.name} ` + afterCursor;
      
      onChangeText(newText);
      
      // Move cursor to after the inserted hashtag
      const newCursorPosition = lastHashIndex + hashtag.name.length + 2; // +2 for # and space
      setTimeout(() => {
        setCursorPosition(newCursorPosition);
        if (inputRef.current) {
          inputRef.current.setNativeProps({
            selection: { start: newCursorPosition, end: newCursorPosition }
          });
        }
      }, 10);
    }
    
    setShowSuggestions(false);
    setIsTypingHashtag(false);
  };

  // Handle text change
  const handleTextChange = (text) => {
    onChangeText(text);
  };

  // Handle selection change (cursor movement)
  const handleSelectionChange = (event) => {
    setCursorPosition(event.nativeEvent.selection.start);
  };

  // Handle keyboard dismiss
  const handleKeyboardDismiss = () => {
    setShowSuggestions(false);
  };

  // Render hashtag suggestion item
  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => selectHashtag(item)}
    >
      <View style={[styles.suggestionIcon, { backgroundColor: theme.colors.accent + '20' }]}>
        <Ionicons name="pricetag" size={16} color={theme.colors.accent} />
      </View>
      <View style={styles.suggestionContent}>
        <Text style={[styles.suggestionName, { color: theme.colors.text }]}>
          #{item.name}
        </Text>
        {item.post_count && (
          <Text style={[styles.suggestionCount, { color: theme.colors.secondary }]}>
            {item.post_count.toLocaleString()} posts
          </Text>
        )}
      </View>
      <Ionicons name="arrow-up-outline" size={16} color={theme.colors.secondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        onSelectionChange={handleSelectionChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.secondary}
        multiline={multiline}
        maxLength={maxLength}
        style={[
          styles.textInput,
          {
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          style,
        ]}
        onBlur={handleKeyboardDismiss}
        {...props}
      />
      
      {/* Hashtag Suggestions Modal */}
      <Modal
        visible={showSuggestions && suggestions.length > 0}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSuggestions(false)}
        >
          <View 
            style={[
              styles.suggestionsContainer, 
              { backgroundColor: theme.colors.primary }
            ]}
          >
            <View style={[styles.suggestionsHeader, { borderBottomColor: theme.colors.border }]}>
              <Ionicons name="pricetag" size={18} color={theme.colors.accent} />
              <Text style={[styles.suggestionsTitle, { color: theme.colors.text }]}>
                {currentHashtag ? `Hashtags matching "${currentHashtag}"` : 'Trending Hashtags'}
              </Text>
            </View>
            
            <FlatList
              data={suggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={(item) => item.name || item.id?.toString()}
              style={styles.suggestionsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Character count */}
      {maxLength && (
        <Text style={[styles.characterCount, { color: theme.colors.secondary }]}>
          {(value || '').length}/{maxLength}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    width: '90%',
    maxHeight: 400,
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  suggestionCount: {
    fontSize: 12,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 8,
  },
});