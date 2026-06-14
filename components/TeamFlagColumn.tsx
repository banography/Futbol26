import { View, Text, StyleSheet } from 'react-native';
import { Team } from '../types/match';
import { TeamFlagImage } from './TeamFlagImage';
import { colors } from '../constants/colors';

interface TeamFlagColumnProps {
  team: Team;
}

export function TeamFlagColumn({ team }: TeamFlagColumnProps) {
  const probLabel = team.winProbability !== null
    ? `${Math.round(team.winProbability * 100)}%`
    : null;

  return (
    <View style={styles.container}>
      <TeamFlagImage flagUrl={team.flagUrl} width={96} height={60} />
      <Text style={styles.name}>{team.name}</Text>
      {probLabel !== null && <Text style={styles.prob}>{probLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  prob: {
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
});
