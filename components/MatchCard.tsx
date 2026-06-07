import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Match } from '../types/match';
import { TeamFlagImage } from './TeamFlagImage';
import { colors } from '../constants/colors';

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
}

export function MatchCard({ match, onPress }: MatchCardProps) {
  const hasWatch = match.watchOptions.length > 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(match)}
    >
      {/* Time + group pill */}
      <View style={styles.topRow}>
        <Text style={styles.time}>{match.time}</Text>
        {match.group !== '' && (
          <View style={styles.groupPill}>
            <Text style={styles.groupPillText}>GROUP {match.group}</Text>
          </View>
        )}
      </View>

      {/* Venue */}
      <Text style={styles.venue}>
        {match.venue}  ·  {match.city}
      </Text>

      {/* Teams */}
      <View style={styles.teamsRow}>
        <View style={styles.teamBlock}>
          <TeamFlagImage flagUrl={match.teamA.flagUrl} />
          <Text style={styles.teamName}>{match.teamA.name.toUpperCase()}</Text>
        </View>

        <Text style={styles.vs}>VS</Text>

        <View style={styles.teamBlock}>
          <TeamFlagImage flagUrl={match.teamB.flagUrl} />
          <Text style={styles.teamName}>{match.teamB.name.toUpperCase()}</Text>
        </View>
      </View>

      {/* Score row — only shown when live or final */}
      {match.score !== null && (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>
            {match.score.teamA}  –  {match.score.teamB}
          </Text>
          {match.status === 'live' && (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          )}
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Broadcast info */}
      {hasWatch ? (
        <View style={styles.watchRow}>
          {match.watchOptions.map((opt, i) => (
            <View key={i} style={styles.watchPill}>
              <Text style={styles.watchPillText}>{opt.network}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.broadcastText}>Broadcast info not confirmed yet</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  cardPressed: {
    opacity: 0.75,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  time: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  groupPill: {
    backgroundColor: colors.groupPillBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  groupPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.groupPillText,
    letterSpacing: 1.5,
  },
  venue: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamName: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  vs: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 3,
    paddingHorizontal: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 10,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  liveBadge: {
    backgroundColor: colors.liveRed,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginBottom: 10,
  },
  broadcastText: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  watchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  watchPill: {
    backgroundColor: colors.watchPillBg,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  watchPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.watchPillText,
    letterSpacing: 0.5,
  },
});
