import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
  TextInput,
} from 'react-native';

import type { Match as WC26Match } from '../src/data/worldCup2026Matches';
import { useMatchData } from '../services/matchDataService';
import { formatMatchTime, formatMatchDate } from '../src/utils/formatMatchTime';
import { DateSection } from '../components/DateSection';
import { WatchSheet } from '../components/WatchSheet';
import { getFlagUrl } from '../services/futbolApi';
import type { Match as AppMatch, DateGroup } from '../types/match';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchesSearch(m: WC26Match, q: string): boolean {
  const lq = q.toLowerCase();
  return (
    m.homeTeam.name.toLowerCase().includes(lq) ||
    m.awayTeam.name.toLowerCase().includes(lq) ||
    m.homeTeam.code.toLowerCase().includes(lq) ||
    m.awayTeam.code.toLowerCase().includes(lq) ||
    (m.group != null && (`group ${m.group}`.toLowerCase().includes(lq) || m.group.toLowerCase() === lq)) ||
    m.venue.toLowerCase().includes(lq) ||
    m.city.toLowerCase().includes(lq)
  );
}

function toLocalDateStr(dateUtc: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(dateUtc));
}

function adaptForTz(m: WC26Match, tz: string): AppMatch {
  return {
    id:          m.id,
    date:        toLocalDateStr(m.dateUtc, tz),
    label:       m.group
      ? `Group ${m.group} · Match ${m.matchNumber}`
      : `${m.stage} · Match ${m.matchNumber}`,
    time:        formatMatchTime(m.dateUtc, tz),
    group:       m.group ?? '',
    matchNumber: m.matchNumber,
    teamA: {
      id:            m.homeTeam.code.toLowerCase(),
      name:          m.homeTeam.name,
      flagEmoji:     m.homeTeam.flag,
      flagUrl:       getFlagUrl(m.homeTeam.code),
      winProbability: null,
    },
    teamB: {
      id:            m.awayTeam.code.toLowerCase(),
      name:          m.awayTeam.name,
      flagEmoji:     m.awayTeam.flag,
      flagUrl:       getFlagUrl(m.awayTeam.code),
      winProbability: null,
    },
    venue:        m.venue,
    city:         m.city,
    country:      m.country,
    watchOptions: [],
    status:       m.status === 'finished' ? 'final' : m.status,
    score:        m.homeScore !== null && m.awayScore !== null
      ? { teamA: m.homeScore, teamB: m.awayScore }
      : null,
  };
}

function groupByLocalDate(matches: WC26Match[], tz: string): DateGroup[] {
  const map = new Map<string, WC26Match[]>();
  for (const m of matches) {
    const key = toLocalDateStr(m.dateUtc, tz);
    const bucket = map.get(key) ?? [];
    bucket.push(m);
    map.set(key, bucket);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const sorted = list.slice().sort((a, b) => a.dateUtc.localeCompare(b.dateUtc));
      return {
        date,
        label: formatMatchDate(sorted[0]!.dateUtc, tz).toUpperCase(),
        matches: sorted.map((m) => adaptForTz(m, tz)),
      };
    });
}

// ── Component ─────────────────────────────────────────────────────────────────

type ViewMode = 'upcoming' | 'results';

interface MatchesScreenProps {
  onMatchPress: (match: AppMatch) => void;
}

export function MatchesScreen({ onMatchPress }: MatchesScreenProps) {
  const [viewMode, setViewMode]         = useState<ViewMode>('upcoming');
  const [watchVisible, setWatchVisible] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const { matches, loading }            = useMatchData();

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (loading) return <View style={styles.root} />;

  const q = searchQuery.trim();

  // Filter at match level so a finished match moves to Results immediately.
  const upcomingGroups = groupByLocalDate(
    matches.filter(m => m.status !== 'finished' && (!q || matchesSearch(m, q))),
    deviceTz,
  );
  const resultsGroups = groupByLocalDate(
    matches.filter(m => m.status === 'finished' && (!q || matchesSearch(m, q))),
    deviceTz,
  ).reverse(); // most recent day first

  return (
    <View style={styles.root}>
      {/* Upcoming | Results toggle */}
      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'upcoming' && styles.toggleBtnActive]}
          onPress={() => setViewMode('upcoming')}
        >
          <Text style={[styles.toggleText, viewMode === 'upcoming' && styles.toggleTextActive]}>
            Upcoming
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'results' && styles.toggleBtnActive]}
          onPress={() => setViewMode('results')}
        >
          <Text style={[styles.toggleText, viewMode === 'results' && styles.toggleTextActive]}>
            Results
          </Text>
        </Pressable>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search team, group, city..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Search matches"
        />
      </View>

      {/* ── Upcoming tab ─────────────────────────────────────────────────────── */}
      {viewMode === 'upcoming' && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {upcomingGroups.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>
                {q ? `No matches for "${q}"` : 'No upcoming matches'}
              </Text>
            </View>
          ) : (
            upcomingGroups.map((group, i) => (
              <DateSection
                key={group.date}
                group={group}
                onMatchPress={onMatchPress}
                onWatchPress={i === 0 && !q ? () => setWatchVisible(true) : undefined}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* ── Results tab ──────────────────────────────────────────────────────── */}
      {viewMode === 'results' && (
        resultsGroups.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>
              {q ? `No matches for "${q}"` : 'No results yet'}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {resultsGroups.map((group) => (
              <DateSection
                key={group.date}
                group={group}
                onMatchPress={onMatchPress}
              />
            ))}
          </ScrollView>
        )
      )}

      {/* Watch sheet modal */}
      <Modal
        visible={watchVisible}
        transparent
        animationType="none"
        onRequestClose={() => setWatchVisible(false)}
      >
        <WatchSheet onClose={() => setWatchVisible(false)} />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:             { flex: 1, backgroundColor: colors.background },
  toggle:           { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2, gap: 8 },
  toggleBtn:        { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  toggleBtnActive:  { backgroundColor: colors.toggleActive, borderColor: colors.textNavy },
  toggleText:       { fontSize: 15, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 0.5 },
  toggleTextActive: { color: colors.textNavy },

  searchWrap:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchInput:      {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontFamily: fonts.interRegular,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  centerBox:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText:        { fontSize: 14, color: colors.textMuted, letterSpacing: 0.4 },
  scroll:           { flex: 1 },
  scrollContent:    { paddingBottom: 40 },
});
