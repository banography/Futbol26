import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DateGroup, Match } from '../types/match';
import { MatchCard } from './MatchCard';
import { colors } from '../constants/colors';

interface DateSectionProps {
  group: DateGroup;
  onMatchPress: (match: Match) => void;
  onWatchPress?: () => void;
}

export function DateSection({ group, onMatchPress, onWatchPress }: DateSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{group.label}</Text>
        <View style={styles.line} />
        {onWatchPress != null && (
          <Pressable
            style={({ pressed }) => [styles.watchPill, pressed && styles.watchPillPressed]}
            onPress={onWatchPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Where to watch"
          >
            <Text style={styles.watchPillText}>Watch</Text>
          </Pressable>
        )}
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
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textNavy,
    letterSpacing: 1.5,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  watchPill: {
    borderWidth: 1,
    borderColor: colors.textNavy,
    borderRadius: 10,
    backgroundColor: '#EDF1F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  watchPillPressed: {
    opacity: 0.6,
  },
  watchPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textNavy,
    letterSpacing: 0.4,
  },
});
