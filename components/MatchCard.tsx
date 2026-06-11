import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Match } from '../types/match';
import { TeamFlagImage } from './TeamFlagImage';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
}

export function MatchCard({ match, onPress }: MatchCardProps) {
  const isFinal = match.status === 'final';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(match)}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        {isFinal ? (
          <>
            {match.group !== '' && (
              <View style={styles.groupPill}>
                <Text style={styles.groupPillText}>GROUP {match.group}</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <Text style={styles.ftLabel}>FT</Text>
          </>
        ) : (
          <>
            <Text style={styles.time}>{match.time}</Text>
            {match.group !== '' && (
              <View style={styles.groupPill}>
                <Text style={styles.groupPillText}>GROUP {match.group}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Venue */}
      <Text style={[styles.venue, isFinal && styles.venueResult]}>
        {match.venue}  ·  {match.city}
      </Text>

      {/* Teams — final: score below each flag; upcoming/live: VS + centered score row */}
      {isFinal ? (
        <View style={styles.teamsRow}>
          <View style={styles.teamBlock}>
            <TeamFlagImage flagUrl={match.teamA.flagUrl} width={80} height={50} />
            <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
              {match.teamA.name.toUpperCase()}
            </Text>
            <Text style={styles.finalScore}>{match.score!.teamA}</Text>
          </View>
          <Text style={styles.vs}>–</Text>
          <View style={styles.teamBlock}>
            <TeamFlagImage flagUrl={match.teamB.flagUrl} width={80} height={50} />
            <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
              {match.teamB.name.toUpperCase()}
            </Text>
            <Text style={styles.finalScore}>{match.score!.teamB}</Text>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.teamsRow}>
            <View style={styles.teamBlock}>
              <TeamFlagImage flagUrl={match.teamA.flagUrl} width={80} height={50} />
              <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
                {match.teamA.name.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.vs}>VS</Text>
            <View style={styles.teamBlock}>
              <TeamFlagImage flagUrl={match.teamB.flagUrl} width={80} height={50} />
              <Text style={styles.teamName} numberOfLines={1} ellipsizeMode="tail">
                {match.teamB.name.toUpperCase()}
              </Text>
            </View>
          </View>
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
        </>
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
    fontSize: 20,
    fontFamily: fonts.barlowBold,
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
    fontSize: 11,
    fontFamily: fonts.barlowBold,
    color: colors.groupPillText,
    letterSpacing: 1.5,
  },
  venue: {
    fontSize: 12,
    fontFamily: fonts.interMedium,
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
    fontSize: 15,
    fontFamily: fonts.barlowBold,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    textAlign: 'center',
    lineHeight: 18,
  },
  vs: {
    fontSize: 18,
    fontFamily: fonts.barlowBold,
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
    fontSize: 26,
    fontFamily: fonts.barlowBold,
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
    fontSize: 10,
    fontFamily: fonts.barlowBold,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  ftLabel: {
    fontSize: 11,
    fontFamily: fonts.barlowBold,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  venueResult: {
    marginBottom: 16,
  },
  finalScore: {
    fontSize: 28,
    fontFamily: fonts.barlowBold,
    color: colors.textPrimary,
    letterSpacing: 2,
    textAlign: 'center',
  },
});
