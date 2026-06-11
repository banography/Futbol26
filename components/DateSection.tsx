import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DateGroup, Match } from '../types/match';
import { MatchCard } from './MatchCard';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';

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
        {onWatchPress && (
          <Pressable
            style={({ pressed }) => [styles.watchBtn, pressed && styles.watchBtnPressed]}
            onPress={onWatchPress}
            accessibilityRole="button"
            accessibilityLabel="Where to watch"
            hitSlop={6}
          >
            <Text style={styles.watchText}>WATCH</Text>
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
  container:      { marginBottom: 8 },
  headerRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, gap: 12 },
  label:          { fontSize: 13, fontFamily: fonts.barlowBold, color: colors.textNavy, letterSpacing: 1.5 },
  line:           { flex: 1, height: 1, backgroundColor: colors.divider },
  watchBtn:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: '#EDF1F6', borderWidth: 1, borderColor: colors.textNavy },
  watchBtnPressed:{ opacity: 0.65 },
  watchText:      { fontSize: 11, fontFamily: fonts.barlowBold, color: colors.textNavy, letterSpacing: 1.5 },
});
