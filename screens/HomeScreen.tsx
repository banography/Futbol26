import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../components/AppHeader';
import { TopTabs, TabId } from '../components/TopTabs';
import { MatchesScreen } from './MatchesScreen';
import { TournamentScreen } from './TournamentScreen';
import { PlayersScreen } from './PlayersScreen';
import { MyBracketScreen } from './MyBracketScreen';
import { Match } from '../types/match';
import { colors } from '../constants/colors';

// ── Component ─────────────────────────────────────────────────────────────────

export function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('matches');

  function handleMatchPress(match: Match) {
    router.push(`/match/${match.id}`);
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <AppHeader />
        <TopTabs activeTab={activeTab} onTabPress={setActiveTab} />

        {activeTab === 'matches' && (
          <MatchesScreen onMatchPress={handleMatchPress} />
        )}

        {activeTab === 'tournament' && (
          <TournamentScreen />
        )}

        {activeTab === 'players' && (
          <PlayersScreen />
        )}

        {activeTab === 'my-bracket' && (
          <MyBracketScreen />
        )}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.headerBg,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
