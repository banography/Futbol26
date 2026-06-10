import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Match } from '../types/match';
import { TeamFlagImage } from './TeamFlagImage';
import { colors } from '../constants/colors';

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
}

export function MatchCard({ match, onPress }: MatchCardProps) {
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
          <TeamFlagImage flagUrl={match.teamA.flagUrl} width={80} height={50} />
          <Text style={styles.teamName}>{match.teamA.name.toUpperCase()}</Text>
        </View>

        <Text style={styles.vs}>VS</Text>

        <View style={styles.teamBlock}>
          <TeamFlagImage flagUrl={match.teamB.flagUrl} width={80} height={50} />
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
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
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
    fontSize: 15,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textNavy,
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 1.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  vs: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textMuted,
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
});
