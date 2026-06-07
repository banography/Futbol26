import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '../components/AppHeader';
import { TopTabs, TabId } from '../components/TopTabs';
import { MatchesScreen } from './MatchesScreen';
import { TournamentScreen } from './TournamentScreen';
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
          <View style={styles.centerBox}>
            <Text style={styles.placeholderText}>Player rosters coming soon</Text>
          </View>
        )}

        {activeTab === 'my-bracket' && (
          <View style={styles.centerBox}>
            <Text style={styles.placeholderText}>Your bracket predictions coming soon.</Text>
          </View>
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  placeholderText: {
    fontSize: 15,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
