import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MatchHero } from '../../components/MatchHero';
import { ProjectedXIToggle } from '../../components/ProjectedXIToggle';
import { getMatchById } from '../../services/futbolApi';
import { Match } from '../../types/match';
import { colors } from '../../constants/colors';

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();

  const [match, setMatch]       = useState<Match | null>(null);
  const [loading, setLoading]   = useState(true);
  const [fetchError, setError]  = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getMatchById(matchId)
      .then((m) => {
        if (!cancelled) {
          setMatch(m);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load match');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : fetchError !== null ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{fetchError}</Text>
          </View>
        ) : match === null ? (
          <View style={styles.centerBox}>
            <Text style={styles.mutedText}>Match not found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <MatchHero match={match} />
            <ProjectedXIToggle match={match} />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.headerBg,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    color: colors.liveRed,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  mutedText: {
    fontSize: 15,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});
