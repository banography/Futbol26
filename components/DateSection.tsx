import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DateGroup, Match } from '../types/match';
import { MatchCard } from './MatchCard';
import { colors } from '../constants/colors';

interface DateSectionProps {
  group: DateGroup;
  onMatchPress: (match: Match) => void;
}

export function DateSection({ group, onMatchPress }: DateSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{group.label}</Text>
        <View style={styles.line} />
      </View>
      {group.matches.map((match) => (
        <MatchCard key={match.id} match={match} onPress={onMatchPress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
});
