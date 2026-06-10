import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
} from 'react-native';

import { WC26_MATCHES } from '../src/data/worldCup2026Matches';
import type { Match as WC26Match } from '../src/data/worldCup2026Matches';
import { formatMatchTime, formatMatchDate } from '../src/utils/formatMatchTime';
import { DateSection } from '../components/DateSection';
import { getFlagUrl } from '../services/futbolApi';
import type { Match as AppMatch, DateGroup } from '../types/match';
import { colors } from '../constants/colors';

// ── Watch sheet data ──────────────────────────────────────────────────────────

type Provider = {
  name: string;
  language: string;
  priceText: string;
  note: string;
};

type WatchRegion = {
  flag: string;
  region: string;
  providers: Provider[];
};

const WATCH_DATA: WatchRegion[] = [
  {
    flag: '🇺🇸',
    region: 'USA',
    providers: [
      { name: 'FOX',            language: 'English', priceText: 'Free*',        note: 'Free with antenna where available · FOX One from $19.99/mo' },
      { name: 'Telemundo',      language: 'Spanish', priceText: 'Free*',        note: 'Free with antenna where available · Peacock from $10.99/mo' },
      { name: 'FS1 / FS2',      language: 'English', priceText: 'From $19.99/mo', note: 'FOX One from $19.99/mo · or TV provider' },
      { name: 'Universo',       language: 'Spanish', priceText: 'From $10.99/mo', note: 'Peacock from $10.99/mo · or TV provider' },
      { name: 'Peacock',        language: 'English', priceText: 'From $10.99/mo', note: 'From $10.99/mo' },
      { name: 'ViX',            language: 'Spanish', priceText: 'Free',          note: 'Free with ads · ViX+ price varies' },
      { name: 'YouTube TV',     language: 'English', priceText: 'From $72.99/mo', note: 'From $72.99/mo' },
      { name: 'Hulu Live TV',   language: 'English', priceText: 'From $82.99/mo', note: 'From $82.99/mo' },
      { name: 'FuboTV',         language: 'English', priceText: 'From $84.99/mo', note: 'From $84.99/mo' },
      { name: 'DirecTV Stream', language: 'English', priceText: 'From $79.99/mo', note: 'From $79.99/mo' },
      { name: 'Sling TV',       language: 'English', priceText: 'From $40/mo',    note: 'From $40/mo' },
    ],
  },
  {
    flag: '🇨🇦',
    region: 'Canada',
    providers: [
      { name: 'CTV',       language: 'English', priceText: 'Free Broadcast',    note: 'Select matches · Free over-the-air where available' },
      { name: 'Noovo',     language: 'French',  priceText: 'Free Broadcast',    note: 'Select French matches · Free over-the-air where available' },
      { name: 'TSN',       language: 'English', priceText: 'Paid Subscription', note: 'All 104 matches · Paid TV/streaming subscription' },
      { name: 'RDS / RDS2',language: 'French',  priceText: 'Paid Subscription', note: 'All 104 matches in French · Paid TV/streaming subscription' },
      { name: 'Crave',     language: 'English', priceText: 'Paid Subscription', note: 'Select CTV live coverage · Requires Crave subscription' },
    ],
  },
  {
    flag: '🇲🇽',
    region: 'Mexico',
    providers: [
      { name: 'Canal 5 / Las Estrellas', language: 'Spanish', priceText: 'Free Broadcast', note: 'Selected matches · Free broadcast TV' },
      { name: 'Azteca 7',                language: 'Spanish', priceText: 'Free Broadcast', note: 'Selected matches · Free broadcast TV' },
      { name: 'ViX',                     language: 'Spanish', priceText: 'Limited Free + Paid Pass', note: '32 matches free · All 104 with Pase Mundial from 499 MXN · annual Premium may include access' },
      { name: 'TUDN',                    language: 'Spanish', priceText: 'Paid Access',     note: 'Paid TV/streaming access where available' },
    ],
  },
  {
    flag: '🌍',
    region: 'Global',
    providers: [
      { name: 'FIFA+', language: 'Multiple', priceText: 'Varies by Country', note: 'Highlights/news · Live availability varies by country' },
    ],
  },
];

// ── Watch sheet UI ────────────────────────────────────────────────────────────

function PriceBadge({ text }: { text: string }) {
  const isFree = text === 'Free Broadcast';
  return (
    <View style={[ws.priceBadge, isFree ? ws.priceBadgeFree : ws.priceBadgeNavy]}>
      <Text style={[ws.priceBadgeText, isFree ? ws.priceBadgeTextFree : ws.priceBadgeTextNavy]}>
        {text}
      </Text>
    </View>
  );
}

function ProviderRow({ provider, isLast }: { provider: Provider; isLast: boolean }) {
  return (
    <View style={[ws.providerRow, !isLast && ws.providerRowBorder]}>
      <View style={ws.providerMain}>
        <Text style={ws.providerName}>{provider.name}</Text>
        <Text style={ws.providerMeta}>{provider.note}</Text>
      </View>
      <PriceBadge text={provider.priceText} />
    </View>
  );
}

function RegionSection({ item }: { item: WatchRegion }) {
  return (
    <View style={ws.regionBlock}>
      <Text style={ws.regionName}>{item.region}</Text>
      <View style={ws.providerList}>
        {item.providers.map((p, i) => (
          <ProviderRow key={p.name} provider={p} isLast={i === item.providers.length - 1} />
        ))}
      </View>
    </View>
  );
}

function WatchSheet({ onClose }: { onClose: () => void }) {
  return (
    <View style={ws.overlay}>
      <Pressable style={ws.backdrop} onPress={onClose} />
      <View style={ws.sheet}>
        <View style={ws.handle} />

        <View style={ws.header}>
          <View>
            <Text style={ws.title}>Where to Watch</Text>
            <Text style={ws.subtitle}>2026 FIFA World Cup</Text>
          </View>
          <Pressable
            style={ws.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
          >
            <Text style={ws.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={ws.body}
          showsVerticalScrollIndicator={false}
        >
          {WATCH_DATA.map((item) => (
            <RegionSection key={item.region} item={item} />
          ))}

          <View style={ws.footer}>
            <Text style={ws.footnote}>
              Broadcast availability and streaming prices vary by country and may change.
            </Text>
            <Text style={ws.source}>Source: FIFA Media · Updated Jun 2026</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const ws = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cardBorder,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    lineHeight: 18,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
  },
  // Region
  regionBlock: {
    gap: 0,
  },
  regionName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  providerList: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  providerRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  providerMain: {
    flex: 1,
    marginRight: 10,
    gap: 2,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  providerMeta: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  // Price badge
  priceBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    flexShrink: 1,
  },
  priceBadgeFree: {
    backgroundColor: colors.groupPillBg,
    borderColor: colors.accent,
  },
  priceBadgeNavy: {
    backgroundColor: '#EDF1F6',
    borderColor: colors.textNavy,
  },
  priceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  priceBadgeTextFree: {
    color: colors.accent,
  },
  priceBadgeTextNavy: {
    color: colors.textNavy,
  },
  // Footer
  footer: {
    gap: 4,
    paddingBottom: 4,
  },
  footnote: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.2,
    lineHeight: 17,
  },
  source: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.4,
    opacity: 0.7,
  },
});

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
      label: formatMatchDate(list[0]!.dateUtc, tz).toUpperCase(),
      matches: list.map((m) => adaptForTz(m, tz)),
    }));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface MatchesScreenProps {
  onMatchPress: (match: AppMatch) => void;
}

export function MatchesScreen({ onMatchPress }: MatchesScreenProps) {
  const [watchVisible, setWatchVisible] = useState(false);

  const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dateGroups = groupByLocalDate(WC26_MATCHES, deviceTz);

  if (dateGroups.length === 0) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyText}>No matches available yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
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
            onWatchPress={() => setWatchVisible(true)}
          />
        ))}
      </ScrollView>

      <Modal
        visible={watchVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWatchVisible(false)}
      >
        <WatchSheet onClose={() => setWatchVisible(false)} />
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 40,
  },
});
