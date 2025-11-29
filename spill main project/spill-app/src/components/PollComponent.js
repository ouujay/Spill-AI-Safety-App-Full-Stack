// components/PollComponent.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const PollComponent = ({ poll, onVote, theme }) => {
  if (!poll) return null;

  return (
    <View style={[styles.pollContainer, { 
      backgroundColor: theme.colors.surface || theme.colors.card, 
      borderColor: theme.colors.border 
    }]}>
      <Text style={[styles.pollQuestion, { color: theme.colors.text }]}>
        {poll.question}
      </Text>
      
      {poll.options?.map((option) => {
        const percentage = poll.total_votes > 0 
          ? Math.round((option.votes / poll.total_votes) * 100) 
          : 0;
        const isSelected = poll.user_voted && poll.user_vote_option === option.id;
        const showResults = poll.user_voted || !poll.is_active;
        
        return (
          <TouchableOpacity
            key={`poll-option-${option.id}`}
            style={[
              styles.pollOption,
              { 
                backgroundColor: isSelected ? theme.colors.accent + '20' : theme.colors.primary,
                borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                opacity: poll.is_active ? 1 : 0.7
              }
            ]}
            onPress={() => {
              if (poll.is_active) {
                onVote(option.id);
              }
            }}
            disabled={!poll.is_active}
          >
            <View style={styles.pollOptionContent}>
              <Text style={[styles.pollOptionText, { color: theme.colors.text }]}>
                {option.text}
              </Text>
              {showResults && (
                <View style={styles.pollStats}>
                  <Text style={[styles.pollVoteCount, { color: theme.colors.secondary }]}>
                    {option.votes || 0}
                  </Text>
                  <Text style={[styles.pollPercentage, { color: theme.colors.secondary }]}>
                    {percentage}%
                  </Text>
                </View>
              )}
            </View>
            
            {showResults && (
              <View style={[styles.pollProgress, { backgroundColor: theme.colors.border }]}>
                <View 
                  style={[
                    styles.pollProgressFill, 
                    { 
                      backgroundColor: isSelected ? theme.colors.accent : theme.colors.secondary + '40',
                      width: `${percentage}%` 
                    }
                  ]} 
                />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
      
      <Text style={[styles.pollMeta, { color: theme.colors.secondary }]}>
        {poll.total_votes || 0} vote{(poll.total_votes || 0) !== 1 ? 's' : ''} • {poll.is_active ? 'Active' : 'Ended'}
        {poll.expires_at && poll.is_active && (
          <Text> • Ends {new Date(poll.expires_at).toLocaleDateString()}</Text>
        )}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pollContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 22,
  },
  pollOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  pollOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  pollOptionText: {
    fontSize: 15,
    flex: 1,
    fontWeight: '500',
  },
  pollStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pollVoteCount: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'right',
  },
  pollPercentage: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 35,
    textAlign: 'right',
  },
  pollProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  pollProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  pollMeta: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default PollComponent;