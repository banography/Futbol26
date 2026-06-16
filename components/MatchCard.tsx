import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Match } from '../types/match';
import { TeamFlagImage } from './TeamFlagImage';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';

// Compact display names for match cards only.
// Source data is never mutated; Match Detail always uses the full official name.
const CARD_ABBREV: Record<string, string> = {
  'Bosnia and Herzegovina':            'Bosnia & Herz.',
  'Bosnia & Herzegovina':              'Bosnia & Herz.',
  'Congo DR':                          'DR Congo',
  'Democratic Republic of the Congo':  'DR Congo',
  'Trinidad and Tobago':               'Trinidad & Tob.',
  'Saint Kitts and Nevis':             'St. Kitts & Nevis',
  'Antigua and Barbuda':               'Antigua & Barb.',
};

function cardName(name: string): string {
  return CARD_ABBREV[name] ?? name;
}

interface MatchCardProps {
  match: Match;
  onPress: (match: Match) => void;
}

export function MatchCard({ match, onPress }: MatchCardProps) {
  const isFinal  = match.status === 'final';
  // Live only when data explicitly says so — never inferred from kickoff time.
  const isLive   = match.status === 'live';
  const hasScore = match.score !== null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(match)}
    >
      {/* Top row: group pill (+ time for scheduled/live) */}
      <View style={styles.topRow}>
        {isFinal ? (
          match.group !== '' && (
            <View style={styles.groupPill}>
              <Text style={styles.groupPillText}>GROUP {match.group}</Text>
            </View>
          )
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

      {/* Teams row */}
      <View style={styles.teamsRow}>
        <View style={styles.teamBlock}>
          <TeamFlagImage flagUrl={match.teamA.flagUrl} width={80} height={50} />
          <Text style={styles.teamName} numberOfLines={2} ellipsizeMode="tail">
            {cardName(match.teamA.name).toUpperCase()}
          </Text>
          {/* Final: score sits under each team name */}
          {isFinal && <Text style={styles.finalScore}>{match.score!.teamA}</Text>}
        </View>

        {/* Center column — changes per status */}
        {isFinal ? (
          // Final: plain dash between scores
          <Text style={styles.centerDash}>–</Text>
        ) : isLive && hasScore ? (
          // Live (explicit): score stacked above LIVE badge
          <View style={styles.liveCenter}>
            <Text style={styles.liveScore}>
              {match.score!.teamA} – {match.score!.teamB}
            </Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </View>
        ) : (
          // Scheduled (or live without score yet)
          <Text style={styles.vs}>VS</Text>
        )}

        <View style={styles.teamBlock}>
          <TeamFlagImage flagUrl={match.teamB.flagUrl} width={80} height={50} />
          <Text style={styles.teamName} numberOfLines={2} ellipsizeMode="tail">
            {cardName(match.teamB.name).toUpperCase()}
          </Text>
          {isFinal && <Text style={styles.finalScore}>{match.score!.teamB}</Text>}
        </View>
      </View>

      {/* Tap affordance */}
      <View style={styles.detailsCue}>
        <Text style={styles.detailsText}> ›</Text>
      </View>
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
  venueResult: {
    marginBottom: 16,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 10,
  },
  teamName: {
    fontSize: 15,
    fontFamily: fonts.barlowBold,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Final center
  centerDash: {
    fontSize: 18,
    fontFamily: fonts.barlowBold,
    color: colors.textMuted,
    paddingHorizontal: 8,
  },
  finalScore: {
    fontSize: 28,
    fontFamily: fonts.barlowBold,
    color: colors.textPrimary,
    letterSpacing: 2,
    textAlign: 'center',
  },
  // Scheduled center
  vs: {
    fontSize: 18,
    fontFamily: fonts.barlowBold,
    color: colors.textMuted,
    letterSpacing: 3,
    paddingHorizontal: 8,
  },
  detailsCue: {
    alignItems: 'flex-end',
    marginTop: 10,
  },
  detailsText: {
    fontSize: 11,
    fontFamily: fonts.interMedium,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  // Live center
  liveCenter: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  liveScore: {
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
});
