import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';

function IconClose() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path
        d="M3 3 L11 11 M11 3 L3 11"
        stroke={colors.textSecondary}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────

type Provider = { name: string; language: string; priceText: string; note: string };
type WatchRegion = { region: string; providers: Provider[] };

const WATCH_DATA: WatchRegion[] = [
  {
    region: 'USA',
    providers: [
      { name: 'FOX',            language: 'English', priceText: 'Free*',               note: 'Free with antenna where available · FOX One from $19.99/mo' },
      { name: 'Telemundo',      language: 'Spanish', priceText: 'Free*',               note: 'Free with antenna where available · Peacock from $10.99/mo' },
      { name: 'FS1 / FS2',      language: 'English', priceText: 'From $19.99/mo',      note: 'FOX One from $19.99/mo · or TV provider' },
      { name: 'Universo',       language: 'Spanish', priceText: 'From $10.99/mo',      note: 'Peacock from $10.99/mo · or TV provider' },
      { name: 'Peacock',        language: 'English', priceText: 'From $10.99/mo',      note: 'From $10.99/mo' },
      { name: 'ViX',            language: 'Spanish', priceText: 'Free',                note: 'Free with ads · ViX+ price varies' },
      { name: 'YouTube TV',     language: 'English', priceText: 'From $72.99/mo',      note: 'From $72.99/mo' },
      { name: 'Hulu Live TV',   language: 'English', priceText: 'From $82.99/mo',      note: 'From $82.99/mo' },
      { name: 'FuboTV',         language: 'English', priceText: 'From $84.99/mo',      note: 'From $84.99/mo' },
      { name: 'DirecTV Stream', language: 'English', priceText: 'From $79.99/mo',      note: 'From $79.99/mo' },
      { name: 'Sling TV',       language: 'English', priceText: 'From $40/mo',         note: 'From $40/mo' },
    ],
  },
  {
    region: 'Canada',
    providers: [
      { name: 'CTV',        language: 'English', priceText: 'Free Broadcast',    note: 'Select matches · Free over-the-air where available' },
      { name: 'Noovo',      language: 'French',  priceText: 'Free Broadcast',    note: 'Select French matches · Free over-the-air where available' },
      { name: 'TSN',        language: 'English', priceText: 'Paid Subscription', note: 'All 104 matches · Paid TV/streaming subscription' },
      { name: 'RDS / RDS2', language: 'French',  priceText: 'Paid Subscription', note: 'All 104 matches in French · Paid TV/streaming subscription' },
      { name: 'Crave',      language: 'English', priceText: 'Paid Subscription', note: 'Select CTV live coverage · Requires Crave subscription' },
    ],
  },
  {
    region: 'Mexico',
    providers: [
      { name: 'Canal 5 / Las Estrellas', language: 'Spanish', priceText: 'Free Broadcast',          note: 'Selected matches · Free broadcast TV' },
      { name: 'Azteca 7',                language: 'Spanish', priceText: 'Free Broadcast',          note: 'Selected matches · Free broadcast TV' },
      { name: 'ViX',                     language: 'Spanish', priceText: 'Limited Free + Paid Pass', note: '32 matches free · All 104 with Pase Mundial from 499 MXN · annual Premium may include access' },
      { name: 'TUDN',                    language: 'Spanish', priceText: 'Paid Access',              note: 'Paid TV/streaming access where available' },
    ],
  },
  {
    region: 'Global',
    providers: [
      { name: 'FIFA+', language: 'Multiple', priceText: 'Varies by Country', note: 'Highlights/news · Live availability varies by country' },
    ],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── WatchSheet ────────────────────────────────────────────────────────────────

const SCREEN_H = Dimensions.get('window').height;
const DISMISS_THRESHOLD = 100;
const DISMISS_VEL = 0.5;

export function WatchSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [activeRegion, setActiveRegion] = useState(WATCH_DATA[0]!.region);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) => dy > 10 && dy > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => { if (dy > 0) translateY.setValue(dy); },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > DISMISS_THRESHOLD || vy > DISMISS_VEL) {
          Animated.timing(translateY, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }).start(onClose);
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  function dismiss() {
    Animated.timing(translateY, { toValue: SCREEN_H, duration: 260, useNativeDriver: true }).start(onClose);
  }

  const region = WATCH_DATA.find((r) => r.region === activeRegion) ?? WATCH_DATA[0]!;

  return (
    <View style={ws.overlay}>
      <Pressable style={ws.backdrop} onPress={dismiss} />
      <Animated.View style={[ws.sheet, { paddingBottom: insets.bottom + 16, transform: [{ translateY }] }]}>
        <View {...panResponder.panHandlers} style={ws.handleArea}>
          <View style={ws.handle} />
        </View>

        <View style={ws.header}>
          <View>
            <Text style={ws.title}>Where to Watch</Text>
            <Text style={ws.subtitle}>2026 FIFA World Cup</Text>
          </View>
          <Pressable style={ws.closeBtn} onPress={dismiss} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
            <IconClose />
          </Pressable>
        </View>

        <View style={ws.tabBar}>
          {WATCH_DATA.map((r) => {
            const active = r.region === activeRegion;
            return (
              <Pressable
                key={r.region}
                style={[ws.tab, active && ws.tabActive]}
                onPress={() => setActiveRegion(r.region)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[ws.tabText, active && ws.tabTextActive]}>{r.region}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={ws.body} showsVerticalScrollIndicator={false}>
          <View style={ws.providerList}>
            {region.providers.map((p, i) => (
              <ProviderRow key={p.name} provider={p} isLast={i === region.providers.length - 1} />
            ))}
          </View>
          <View style={ws.footer}>
            <Text style={ws.footnote}>
              * Free broadcast channels may require antenna/local availability. Streaming prices subject to change.
            </Text>
            <Text style={ws.source}>Source: FIFA Media · Updated Jun 2026</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ws = StyleSheet.create({
  overlay:          { flex: 1, justifyContent: 'flex-end' },
  backdrop:         { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet:            { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  handleArea:       { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handle:           { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder },
  header:           { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  title:            { fontSize: 20, fontFamily: fonts.barlowBold, color: colors.textPrimary, letterSpacing: 0.2, marginBottom: 2 },
  subtitle:         { fontSize: 12, fontFamily: fonts.interMedium, color: colors.textMuted, letterSpacing: 0.4 },
  closeBtn:         { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  tabBar:           { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.divider },
  tab:              { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabActive:        { borderBottomColor: colors.textNavy },
  tabText:          { fontSize: 14, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 0.2 },
  tabTextActive:    { fontFamily: fonts.barlowBold, color: colors.textNavy },
  body:             { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 16 },
  providerList:     { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, backgroundColor: colors.background, overflow: 'hidden' },
  providerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11 },
  providerRowBorder:{ borderBottomWidth: 1, borderBottomColor: colors.divider },
  providerMain:     { flex: 1, marginRight: 10, gap: 2 },
  providerName:     { fontSize: 15, fontFamily: fonts.barlowSemi, color: colors.textPrimary, letterSpacing: 0.1 },
  providerMeta:     { fontSize: 12, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.2 },
  priceBadge:       { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, flexShrink: 1 },
  priceBadgeFree:   { backgroundColor: colors.groupPillBg, borderColor: colors.accent },
  priceBadgeNavy:   { backgroundColor: colors.toggleActive, borderColor: colors.textNavy },
  priceBadgeText:   { fontSize: 11, fontFamily: fonts.barlowBold, letterSpacing: 0.2 },
  priceBadgeTextFree: { color: colors.accent },
  priceBadgeTextNavy: { color: colors.textNavy },
  footer:           { gap: 4, paddingBottom: 4 },
  footnote:         { fontSize: 12, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.2, lineHeight: 17 },
  source:           { fontSize: 11, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.4, opacity: 0.7 },
});
