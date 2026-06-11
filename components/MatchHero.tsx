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
  return (
    <View style={styles.container}>
      {/* Stage · Match label — uses the pre-built label from match data */}
      <Text style={styles.matchLabel}>{match.label.toUpperCase()}</Text>

      {/* 3-column matchup row */}
      <View style={styles.row}>
        {/* Team A */}
        <TeamFlagColumn team={match.teamA} />

        {/* Center: VS / time / venue */}
        <View style={styles.center}>
          <Text style={styles.vs}>VS</Text>
          <Text style={styles.time}>{match.time}</Text>
          <Text style={styles.venue} numberOfLines={2}>
            {match.venue}
          </Text>
          <Text style={styles.city}>{match.city}</Text>
        </View>

        {/* Team B */}
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
  venue: {
    fontSize: 10,
    fontFamily: fonts.interRegular,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  city: {
    fontSize: 10,
    fontFamily: fonts.interRegular,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
