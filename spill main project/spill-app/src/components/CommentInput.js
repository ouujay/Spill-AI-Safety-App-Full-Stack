// components/CommentInput.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

const CommentInput = ({
  newComment,
  setNewComment,
  onSubmit,
  posting,
  replyingTo,
  onCancelReply,
  insets,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[
      styles.commentInputContainer, 
      { 
        backgroundColor: theme.colors.card,
        borderTopColor: theme.colors.border,
        paddingBottom: insets.bottom + 12
      }
    ]}>
      {replyingTo && (
        <View style={[
          styles.replyingToContainer, 
          { backgroundColor: theme.colors.surface }
        ]}>
          <Text style={[styles.replyingToText, { color: theme.colors.secondary }]}>
            Replying to {replyingTo.author?.name}
          </Text>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close" size={20} color={theme.colors.secondary} />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.commentInputRow}>
        <TextInput
          style={[
            styles.commentInput,
            { 
              color: theme.colors.text,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface
            }
          ]}
          placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
          placeholderTextColor={theme.colors.secondary}
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            { 
              backgroundColor: newComment.trim() ? theme.colors.accent : theme.colors.surface,
              opacity: posting ? 0.5 : 1
            }
          ]}
          onPress={onSubmit}
          disabled={!newComment.trim() || posting}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons 
              name="send" 
              size={20} 
              color={newComment.trim() ? "#fff" : theme.colors.secondary} 
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  commentInputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyingToContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CommentInput;