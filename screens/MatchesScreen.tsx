import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { WC26_MATCHES } from '../src/data/worldCup2026Matches';
import type { Match as WC26Match } from '../src/data/worldCup2026Matches';
import { formatMatchTime, formatMatchDate } from '../src/utils/formatMatchTime';
import { TIMEZONES } from '../src/utils/timezones';
import { DateSection } from '../components/DateSection';
import { getFlagUrl } from '../services/futbolApi';
import type { Match as AppMatch, DateGroup } from '../types/match';
import { colors } from '../constants/colors';

const TZ_KEY = '@futbol26/selectedTimezone';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDateStr(dateUtc: string, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year:     'numeric',
    month:    '2-digit',
    day:      '2-digit',
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
      id:             m.homeTeam.code.toLowerCase(),
      name:           m.homeTeam.name,
      flagEmoji:      m.homeTeam.flag,
      flagUrl:        getFlagUrl(m.homeTeam.code),
      winProbability: null,
    },
    teamB: {
      id:             m.awayTeam.code.toLowerCase(),
      name:           m.awayTeam.name,
      flagEmoji:      m.awayTeam.flag,
      flagUrl:        getFlagUrl(m.awayTeam.code),
      winProbability: null,
    },
    venue:        m.venue,
    city:         m.city,
    country:      m.country,
    watchOptions: [],
    status:       m.status === 'finished' ? 'final' : m.status,
    score:        null,
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
    .map(([date, list]) => ({
      date,
      // e.g. "THU, JUN 11"
      label: formatMatchDate(list[0]!.dateUtc, tz).toUpperCase(),
      matches: list.map((m) => adaptForTz(m, tz)),
    }));
}

function tzLabel(tzValue: string): string {
  // Prefer an explicit named match over "My Local Time" when possible
  const named = TIMEZONES.slice(1).find((t) => t.value === tzValue);
  if (named) return named.label;
  if (TIMEZONES[0]?.value === tzValue) return TIMEZONES[0].label;
  return tzValue; // raw IANA string as fallback
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MatchesScreenProps {
  onMatchPress: (match: AppMatch) => void;
}

export function MatchesScreen({ onMatchPress }: MatchesScreenProps) {
  const [selectedTzId, setSelectedTzId] = useState<string>('local');

const selectedTzOption =
  TIMEZONES.find((tz) => tz.id === selectedTzId) ?? TIMEZONES[0];

const selectedTz = selectedTzOption.value;
  const [tzReady, setTzReady]       = useState(false);
  const [modalOpen, setModalOpen]   = useState(false);

  // Load persisted timezone once on mount
  useEffect(() => {
    AsyncStorage.getItem(TZ_KEY)
      .then((stored) => {
        if (stored) setSelectedTzId(stored);
  })
      .catch(() => { /* ignore read errors, keep device default */ })
      .finally(() => setTzReady(true));
  }, []);

  const handleSelectTz = useCallback((id: string) => {
    setSelectedTzId(id);
    setModalOpen(false);
    AsyncStorage.setItem(TZ_KEY, id).catch(() => {});
}, []);

  if (!tzReady) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const dateGroups = groupByLocalDate(WC26_MATCHES, selectedTz);
  const label = tzLabel(selectedTz);

  return (
    <View style={styles.root}>
      {/* ── Timezone indicator bar ────────────────────────────────────────── */}
      <View style={styles.tzBar}>
        <Text style={styles.tzBarText}>Times shown in:  {label}</Text>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => setModalOpen(true)}
          accessibilityLabel="Change timezone"
        >
          <Text style={styles.settingsBtnText}>⚙</Text>
        </Pressable>
      </View>

      {/* ── Match list ───────────────────────────────────────────────────── */}
      {dateGroups.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyText}>No matches available yet</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {dateGroups.map((group) => (
            <DateSection
              key={group.date}
              group={group}
              onMatchPress={onMatchPress}
            />
          ))}
        </ScrollView>
      )}

      {/* ── Timezone selector modal ──────────────────────────────────────── */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        {/* Tapping the dark overlay closes the modal */}
        <Pressable style={styles.modalOverlay} onPress={() => setModalOpen(false)}>
          {/* Inner Pressable stops the tap from bubbling to the overlay */}
          <Pressable style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Time Settings</Text>

            {TIMEZONES.map((tz) => {
              const isActive = tz.id === selectedTzId;
              return (
                <Pressable
                  key={tz.id}
                  style={[styles.tzOption, isActive && styles.tzOptionActive]}
                  onPress={() => handleSelectTz(tz.id)}
                >
                  <Text
                    style={[
                      styles.tzOptionText,
                      isActive && styles.tzOptionTextActive,
                    ]}
                  >
                    {tz.label}
                  </Text>
                  {isActive && (
                    <Text style={styles.tzCheckmark}>✓</Text>
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    letterSpacing: 0.4,
  },

  // Timezone indicator bar
  tzBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tzBarText: {
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  settingsBtnText: {
    fontSize: 15,
    color: colors.textSecondary,
  },

  // Match list
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 40,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 16,
  },
  tzOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  tzOptionActive: {
    backgroundColor: colors.groupPillBg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tzOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  tzOptionTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  tzCheckmark: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '700',
  },
});
