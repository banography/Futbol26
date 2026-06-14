import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Match } from '../types/match';
import { TeamFlagColumn } from './TeamFlagColumn';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';

interface MatchHeroProps {
  match: Match;
}

export function MatchHero({ match }: MatchHeroProps) {
  const isFinal  = match.status === 'final';
  const isLive   = match.status === 'live';
  const hasScore = match.score !== null;
  const showScore = (isFinal || isLive) && hasScore;

  return (
    <View style={styles.container}>
      <Text style={styles.matchLabel}>{match.label.toUpperCase()}</Text>

      <View style={styles.row}>
        <TeamFlagColumn team={match.teamA} />

        <View style={styles.center}>
          {showScore ? (
            <>
              {isLive && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              )}
              <View style={styles.scoreRow}>
                <Text style={styles.scoreNum}>{match.score!.teamA}</Text>
                <Text style={styles.scoreSep}>–</Text>
                <Text style={styles.scoreNum}>{match.score!.teamB}</Text>
              </View>
              {isFinal && <Text style={styles.ftLabel}>Full Time</Text>}
            </>
          ) : (
            <>
              <Text style={styles.vs}>VS</Text>
              <Text style={styles.time}>{match.time}</Text>
            </>
          )}
          <Text style={styles.venue} numberOfLines={2}>{match.venue}</Text>
          <Text style={styles.city}>{match.city}</Text>
        </View>

        <TeamFlagColumn team={match.teamB} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  matchLabel: {
    fontSize: 11,
    fontFamily: fonts.barlowBold,
    color: colors.accentCyan,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  center: {
    width: 88,
    alignItems: 'center',
    gap: 4,
  },
  vs: {
    fontSize: 22,
    fontFamily: fonts.barlowBold,
    color: colors.accent,
    letterSpacing: 3,
  },
  time: {
    fontSize: 11,
    fontFamily: fonts.barlowSemi,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreNum: {
    fontSize: 36,
    fontFamily: fonts.barlowBold,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  scoreSep: {
    fontSize: 28,
    fontFamily: fonts.barlowBold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  ftLabel: {
    fontSize: 10,
    fontFamily: fonts.barlowSemi,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  liveBadge: {
    backgroundColor: colors.liveRed,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontFamily: fonts.barlowBold,
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  venue: {
    fontSize: 10,
    fontFamily: fonts.interRegular,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 6,
  },
  city: {
    fontSize: 10,
    fontFamily: fonts.interRegular,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
