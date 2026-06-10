import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ProjectedPlayerCard } from './ProjectedPlayerCard';
import { getSquad } from '../src/data/worldCup2026Squads';
import type { PositionCode } from '../src/data/worldCup2026Squads';
import type { Match } from '../types/match';
import { colors } from '../constants/colors';

// const POSITION_ORDER: PositionCode[] = ['GK', 'DF', 'MF', 'FW'];
const POSITION_ORDER: PositionCode[] = ['FW', 'MF', 'DF', 'GK'];


const GROUP_LABEL: Record<PositionCode, string> = {
  FW: 'FORWARD',
  MF: 'MIDFIELDER',
  DF: 'DEFENDER',
  GK: 'GOALKEEPER',
};

interface ProjectedXIToggleProps {
  match: Match;
}

export function ProjectedXIToggle({ match }: ProjectedXIToggleProps) {
  const [selectedSide, setSelectedSide] = useState<'teamA' | 'teamB'>('teamA');

  // team IDs are lowercase FIFA codes (e.g. "mex"), squads are keyed uppercase
  const selectedTeam = selectedSide === 'teamA' ? match.teamA : match.teamB;
  const squad = getSquad(selectedTeam.id);

  return (
    <View style={styles.container}>
      {/* Section heading */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>ROSTER</Text>
        <View style={styles.headerLine} />
      </View>

      {/* Team toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.togglePill, selectedSide === 'teamA' && styles.togglePillActive]}
          onPress={() => setSelectedSide('teamA')}
        >
          <Text style={[styles.toggleText, selectedSide === 'teamA' && styles.toggleTextActive]}>
            {match.teamA.name}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.togglePill, selectedSide === 'teamB' && styles.togglePillActive]}
          onPress={() => setSelectedSide('teamB')}
        >
          <Text style={[styles.toggleText, selectedSide === 'teamB' && styles.toggleTextActive]}>
            {match.teamB.name}
          </Text>
        </Pressable>
      </View>

      {/* Player list or empty state */}
      {squad === null ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Squad data coming soon.</Text>
        </View>
      ) : (
        <View>
          {/* Head coach */}
          {squad.headCoach ? (
            <View>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>HEAD COACH</Text>
                <View style={styles.headerLine} />
              </View>
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>{squad.headCoach}</Text>
                {squad.headCoachNationality ? (
                  <Text style={styles.coachNat}>Nationality: {squad.headCoachNationality}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {POSITION_ORDER.map((pos) => {
            const group = squad.players.filter((p) => p.position === pos);
            if (group.length === 0) return null;
            return (
              <View key={pos}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{GROUP_LABEL[pos]}</Text>
                  <View style={styles.headerLine} />
                </View>
                {group.map((player) => (
                  <ProjectedPlayerCard
                    key={player.id}
                    player={player}
                    teamFlag={selectedTeam.flagEmoji}
                  />
                ))}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  togglePillActive: {
    backgroundColor: colors.groupPillBg,
    borderColor: colors.accent,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tabInactiveText,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  toggleTextActive: {
    color: colors.accent,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  coachInfo: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  coachName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  coachNat: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  emptyState: {
    paddingVertical: 36,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 20,
  },
});
