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
import Svg, { Path } from 'react-native-svg';

function IconBack() {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20">
      <Path
        d="M13 4 L7 10 L13 16"
        stroke={colors.textPrimary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MatchHero } from '../../components/MatchHero';
import { ProjectedXIToggle } from '../../components/ProjectedXIToggle';
import { getMatchById } from '../../services/futbolApi';
import { Match } from '../../types/match';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';

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
          <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back">
            <IconBack />
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
    fontFamily: fonts.interRegular,
    color: colors.liveRed,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  mutedText: {
    fontSize: 15,
    fontFamily: fonts.interRegular,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});
