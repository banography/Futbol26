import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { colors, PALETTE } from '../constants/colors';
import { fonts } from '../constants/typography';
import { TeamFlagImage } from '../components/TeamFlagImage';
import { getFlagUrl } from '../services/futbolApi';
import { WC26_MATCHES } from '../src/data/worldCup2026Matches';
import type { Match as WC26Match } from '../src/data/worldCup2026Matches';
import { formatMatchTime, formatMatchDate } from '../src/utils/formatMatchTime';
import {
  loadDailyPredictions, saveDailyPredictions, emptyPrediction,
} from '../services/dailyPredictionsService';
import type { DailyPredictions, DailyOutcome } from '../services/dailyPredictionsService';

// ── Constants ─────────────────────────────────────────────────────────────────

const SCREEN_W  = Dimensions.get('window').width;
const COL_GAP   = 8;
const H_PAD     = 16;
const CARD_W    = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;
const TZ        = Intl.DateTimeFormat().resolvedOptions().timeZone;

const GROUPS          = ['A','B','C','D','E','F','G','H','I','J','K','L'] as const;
const GROUP_PICKS_KEY = 'bracket_group_picks';
const KNOCKOUT_KEY    = 'bracket_knockout_picks';

type SubTab       = 'today' | 'bracket' | 'share';
type BracketSection = 'groups' | 'knockout';
type MatchOutcome = 'home' | 'draw' | 'away';
type GroupPicks   = Record<string, MatchOutcome>;

type TeamStats = {
  code: string;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

// ── Group picks storage ───────────────────────────────────────────────────────

async function loadGroupPicks(): Promise<GroupPicks> {
  try {
    const raw = await AsyncStorage.getItem(GROUP_PICKS_KEY);
    return raw ? (JSON.parse(raw) as GroupPicks) : {};
  } catch {
    return {};
  }
}

async function saveGroupPicks(picks: GroupPicks): Promise<void> {
  try {
    await AsyncStorage.setItem(GROUP_PICKS_KEY, JSON.stringify(picks));
  } catch {}
}

// ── Knockout picks storage ────────────────────────────────────────────────────

async function loadKnockoutPicks(): Promise<Record<number, string>> {
  try {
    const raw = await AsyncStorage.getItem(KNOCKOUT_KEY);
    return raw ? (JSON.parse(raw) as Record<number, string>) : {};
  } catch {
    return {};
  }
}

async function saveKnockoutPicks(picks: Record<number, string>): Promise<void> {
  try {
    await AsyncStorage.setItem(KNOCKOUT_KEY, JSON.stringify(picks));
  } catch {}
}

// ── Group stage data ──────────────────────────────────────────────────────────

const GROUP_STAGE_MATCHES = WC26_MATCHES.filter(m => m.stage === 'Group Stage');

function getGroupMatches(group: string): WC26Match[] {
  return GROUP_STAGE_MATCHES.filter(m => m.group === group);
}

// ── Standings calculation ─────────────────────────────────────────────────────

function computeStandings(groupMatches: WC26Match[], picks: GroupPicks): TeamStats[] {
  const teams = new Map<string, TeamStats>();
  for (const m of groupMatches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (!teams.has(t.code)) {
        teams.set(t.code, { code: t.code, name: t.name, played: 0, wins: 0, draws: 0, losses: 0, points: 0 });
      }
    }
  }
  for (const m of groupMatches) {
    const outcome = picks[m.id];
    if (!outcome) continue;
    const home = teams.get(m.homeTeam.code)!;
    const away = teams.get(m.awayTeam.code)!;
    home.played++; away.played++;
    if (outcome === 'home') {
      home.wins++; home.points += 3; away.losses++;
    } else if (outcome === 'draw') {
      home.draws++; home.points += 1; away.draws++; away.points += 1;
    } else {
      away.wins++; away.points += 3; home.losses++;
    }
  }
  return Array.from(teams.values()).sort((a, b) =>
    b.points !== a.points ? b.points - a.points : a.name.localeCompare(b.name),
  );
}

// ── Today helpers ─────────────────────────────────────────────────────────────

function getLocalDateStr(dateUtc: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(dateUtc));
}

function getTodayOrNextMatchday(): { matches: WC26Match[]; label: string } {
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const todayMatches = WC26_MATCHES.filter(m => getLocalDateStr(m.dateUtc) === todayStr);
  if (todayMatches.length > 0) return { matches: todayMatches, label: "Today's Matches" };

  const now = Date.now();
  const upcoming = WC26_MATCHES
    .filter(m => new Date(m.dateUtc).getTime() > now)
    .sort((a, b) => a.dateUtc.localeCompare(b.dateUtc));
  if (upcoming.length === 0) return { matches: [], label: 'No Upcoming Matches' };

  const nextDate = getLocalDateStr(upcoming[0]!.dateUtc);
  return {
    matches: upcoming.filter(m => getLocalDateStr(m.dateUtc) === nextDate),
    label:   `Next Matches · ${formatMatchDate(upcoming[0]!.dateUtc, TZ)}`,
  };
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function TrophySVG() {
  return (
    <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
      <Path d="M6 2h12v7a6 6 0 01-12 0V2z" fill={colors.groupPillBg} stroke={colors.accent} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M2 3h4M18 3h4M2 7c0 2 1.5 3.5 4 3.5M22 7c0 2-1.5 3.5-4 3.5" stroke={colors.accent} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M12 13v4M8 21h8" stroke={colors.accent} strokeWidth={1.4} strokeLinecap="round" />
      <Rect x={9} y={17} width={6} height={1.5} rx={0.75} fill={colors.accent} />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5L20 7" stroke={colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function LockSVG({ size = 13, color = colors.textSecondary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Rect x={3} y={11} width={18} height={11} rx={3} stroke={color} strokeWidth={1.8} fill={colors.divider} />
      <Circle cx={12} cy={17} r={1.5} fill={color} />
    </Svg>
  );
}

function ShareSVG({ color = colors.accent }: { color?: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronSVG({ open }: { open: boolean }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d={open ? 'M18 15 L12 9 L6 15' : 'M6 9 L12 15 L18 9'}
        stroke={colors.textMuted}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Sub-tab bar ───────────────────────────────────────────────────────────────

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'today',   label: 'Today'   },
  { id: 'bracket', label: 'Bracket' },
  { id: 'share',   label: 'Share'   },
];

function SubTabBar({ active, onPress }: { active: SubTab; onPress: (t: SubTab) => void }) {
  return (
    <View style={stb.bar}>
      {SUB_TABS.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <Pressable
            key={id}
            style={[stb.tab, isActive && stb.tabActive]}
            onPress={() => onPress(id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[stb.text, isActive && stb.textActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const stb = StyleSheet.create({
  bar:       { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tab:       { flex: 1, alignItems: 'center', paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabActive: { borderBottomColor: colors.accent },
  text:      { fontSize: 15, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 0.2 },
  textActive:{ fontSize: 15, fontFamily: fonts.barlowBold, color: colors.accent, letterSpacing: 0.2 },
});

// ── Reset button ──────────────────────────────────────────────────────────────

function ResetButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={rb.wrap}>
      <Pressable style={({ pressed }) => [rb.btn, pressed && rb.pressed]} onPress={onPress} accessibilityRole="button">
        <Text style={rb.text}>Reset Picks</Text>
      </Pressable>
    </View>
  );
}

const rb = StyleSheet.create({
  wrap:    { paddingHorizontal: H_PAD, paddingTop: 8, paddingBottom: 32 },
  btn:     { paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  pressed: { opacity: 0.55 },
  text:    { fontSize: 13, fontFamily: fonts.barlowSemi, color: colors.textSecondary, letterSpacing: 0.3 },
});

// ── TodayMatchCard ────────────────────────────────────────────────────────────

function TodayMatchCard({
  match, prediction, locked, onOutcome, onScoreChange, onNoteChange,
}: {
  match: WC26Match;
  prediction: DailyPredictions[string] | undefined;
  locked: boolean;
  onOutcome: (outcome: DailyOutcome) => void;
  onScoreChange: (field: 'predictedHomeScore' | 'predictedAwayScore', value: string) => void;
  onNoteChange: (field: 'scorerNote' | 'userNote', value: string) => void;
}) {
  const outcome    = prediction?.outcome ?? null;
  const homeScore  = prediction?.predictedHomeScore;
  const awayScore  = prediction?.predictedAwayScore;
  const scorerNote = prediction?.scorerNote ?? '';
  const userNote   = prediction?.userNote ?? '';

  const hasDetails = homeScore != null || awayScore != null || !!scorerNote || !!userNote;
  const [showDetails, setShowDetails] = useState(false);
  const detailsOpen = showDetails || hasDetails || locked;

  const stageLabel = match.group ? `GROUP ${match.group} · M${match.matchNumber}` : `M${match.matchNumber}`;
  const kickoff    = formatMatchTime(match.dateUtc, TZ);

  return (
    <View style={tmc.card}>
      {/* Header */}
      <View style={tmc.cardHeader}>
        <Text style={tmc.stageLabel}>{stageLabel}</Text>
        <View style={tmc.headerRight}>
          {locked && <LockSVG size={12} color={colors.textMuted} />}
          <Text style={tmc.time}>{kickoff}</Text>
        </View>
      </View>

      {/* Venue */}
      {!!(match.venue || match.city) && (
        <Text style={tmc.venue} numberOfLines={1}>{[match.venue, match.city].filter(Boolean).join(', ')}</Text>
      )}

      {/* Teams */}
      <View style={tmc.teamsRow}>
        <View style={tmc.teamSide}>
          <TeamFlagImage flagUrl={getFlagUrl(match.homeTeam.code)} width={26} height={17} />
          <Text style={tmc.teamName} numberOfLines={1}>{match.homeTeam.name}</Text>
        </View>
        <Text style={tmc.vsText}>vs</Text>
        <View style={[tmc.teamSide, tmc.teamSideRight]}>
          <Text style={[tmc.teamName, tmc.teamNameRight]} numberOfLines={1}>{match.awayTeam.name}</Text>
          <TeamFlagImage flagUrl={getFlagUrl(match.awayTeam.code)} width={26} height={17} />
        </View>
      </View>

      {/* Pick buttons */}
      <View style={tmc.pickRow}>
        {(['home', 'draw', 'away'] as const).map(o => (
          <Pressable
            key={o}
            style={[tmc.pickBtn, outcome === o && tmc.pickBtnSelected, locked && tmc.pickBtnDisabled]}
            onPress={() => !locked && onOutcome(o)}
            disabled={locked}
            accessibilityRole="button"
            accessibilityState={{ selected: outcome === o, disabled: locked }}
          >
            <Text style={[tmc.pickBtnText, outcome === o && tmc.pickBtnTextSelected]}>
              {o === 'home' ? match.homeTeam.code : o === 'away' ? match.awayTeam.code : 'Draw'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Details toggle */}
      <Pressable
        style={tmc.detailsToggle}
        onPress={() => setShowDetails(prev => !prev)}
        accessibilityRole="button"
        accessibilityLabel={detailsOpen ? 'Hide details' : 'Add score and notes'}
      >
        <Text style={tmc.detailsToggleText}>{detailsOpen ? 'Hide details' : 'Score & notes'}</Text>
        <ChevronSVG open={detailsOpen} />
      </Pressable>

      {/* Collapsible details */}
      {detailsOpen && (
        <View style={tmc.details}>
          <View style={tmc.detailRow}>
            <Text style={tmc.detailLabel}>Score</Text>
            <TextInput
              style={[tmc.scoreInput, locked && tmc.inputLocked]}
              value={homeScore != null ? String(homeScore) : ''}
              onChangeText={v => onScoreChange('predictedHomeScore', v)}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              editable={!locked}
              accessibilityLabel="Home predicted score"
            />
            <Text style={tmc.scoreDash}>–</Text>
            <TextInput
              style={[tmc.scoreInput, locked && tmc.inputLocked]}
              value={awayScore != null ? String(awayScore) : ''}
              onChangeText={v => onScoreChange('predictedAwayScore', v)}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="—"
              placeholderTextColor={colors.textMuted}
              editable={!locked}
              accessibilityLabel="Away predicted score"
            />
          </View>
          <View style={tmc.detailRow}>
            <Text style={tmc.detailLabel}>Scorer note</Text>
            <TextInput
              style={[tmc.noteInput, locked && tmc.inputLocked]}
              value={scorerNote}
              onChangeText={v => onNoteChange('scorerNote', v)}
              placeholder="Who scores?"
              placeholderTextColor={colors.textMuted}
              editable={!locked}
              maxLength={80}
              returnKeyType="done"
              accessibilityLabel="Scorer note"
            />
          </View>
          <View style={[tmc.detailRow, tmc.detailRowLast]}>
            <Text style={tmc.detailLabel}>Note</Text>
            <TextInput
              style={[tmc.noteInput, locked && tmc.inputLocked]}
              value={userNote}
              onChangeText={v => onNoteChange('userNote', v)}
              placeholder="Your note..."
              placeholderTextColor={colors.textMuted}
              editable={!locked}
              maxLength={120}
              returnKeyType="done"
              accessibilityLabel="Your note"
            />
          </View>
        </View>
      )}
    </View>
  );
}

const tmc = StyleSheet.create({
  card:              { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, marginHorizontal: H_PAD, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  cardHeader:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  stageLabel:        { fontSize: 11, fontFamily: fonts.barlowBold, color: colors.textNavy, letterSpacing: 1.2 },
  headerRight:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  time:              { fontSize: 12, fontFamily: fonts.interMedium, color: colors.textMuted, letterSpacing: 0.2 },
  venue:             { fontSize: 11, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.2, paddingHorizontal: 14, marginBottom: 10 },
  teamsRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 12, gap: 6 },
  teamSide:          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  teamSideRight:     { justifyContent: 'flex-end' },
  teamName:          { flex: 1, fontSize: 13, fontFamily: fonts.interSemi, color: colors.textPrimary, letterSpacing: 0.1 },
  teamNameRight:     { textAlign: 'right' },
  vsText:            { fontSize: 11, fontFamily: fonts.barlowBold, color: colors.textMuted },
  pickRow:           { flexDirection: 'row', gap: 6, paddingHorizontal: 14, marginBottom: 0 },
  pickBtn:           { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', backgroundColor: colors.neutralUnselected, borderWidth: 1, borderColor: colors.neutralBorder },
  pickBtnSelected:   { backgroundColor: colors.neutralSelected, borderColor: colors.neutralSelected },
  pickBtnDisabled:   { opacity: 0.45 },
  pickBtnText:       { fontSize: 11, fontFamily: fonts.barlowSemi, color: colors.neutralText, letterSpacing: 0.5 },
  pickBtnTextSelected: { color: '#FFFFFF' },
  detailsToggle:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  detailsToggleText: { fontSize: 12, fontFamily: fonts.barlowSemi, color: colors.textMuted, letterSpacing: 0.4 },
  details:           { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10 },
  detailRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 8, gap: 8 },
  detailRowLast:     { marginBottom: 14 },
  detailLabel:       { fontSize: 11, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 0.5, width: 72 },
  scoreInput:        { width: 44, height: 34, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.background, textAlign: 'center', fontSize: 15, fontFamily: fonts.barlowBold, color: colors.textPrimary },
  scoreDash:         { fontSize: 15, fontFamily: fonts.barlowBold, color: colors.textMuted },
  noteInput:         { flex: 1, height: 34, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.background, paddingHorizontal: 10, fontSize: 13, fontFamily: fonts.interRegular, color: colors.textPrimary },
  inputLocked:       { opacity: 0.4 },
});

// ── TodayTab ──────────────────────────────────────────────────────────────────

function TodayTab({
  dailyPredictions, onOutcome, onScoreChange, onNoteChange, onLockToggle,
}: {
  dailyPredictions: DailyPredictions;
  onOutcome: (matchId: string, outcome: DailyOutcome) => void;
  onScoreChange: (matchId: string, field: 'predictedHomeScore' | 'predictedAwayScore', value: string) => void;
  onNoteChange: (matchId: string, field: 'scorerNote' | 'userNote', value: string) => void;
  onLockToggle: (matchIds: string[], lock: boolean) => void;
}) {
  const { matches, label } = useMemo(getTodayOrNextMatchday, []);
  const matchIds      = matches.map(m => m.id);
  const isTodayLocked = matchIds.length > 0 && matchIds.some(id => dailyPredictions[id]?.lockedAt != null);

  if (matches.length === 0) {
    return (
      <View style={tdt.emptyWrap}>
        <TrophySVG />
        <Text style={tdt.emptyTitle}>No matches scheduled</Text>
        <Text style={tdt.emptySub}>Check back closer to the tournament</Text>
      </View>
    );
  }

  return (
    <ScrollView style={tdt.scroll} contentContainerStyle={tdt.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={tdt.header}>
        <Text style={tdt.headerLabel}>{label}</Text>
        <Pressable
          style={({ pressed }) => [tdt.lockBtn, isTodayLocked && tdt.lockBtnLocked, pressed && tdt.lockBtnPressed]}
          onPress={() => onLockToggle(matchIds, !isTodayLocked)}
          accessibilityRole="button"
          accessibilityLabel={isTodayLocked ? 'Unlock / Edit picks' : 'Lock picks'}
        >
          <LockSVG size={12} color={isTodayLocked ? '#FFFFFF' : colors.textSecondary} />
          <Text style={[tdt.lockBtnText, isTodayLocked && tdt.lockBtnTextLocked]}>
            {isTodayLocked ? 'Unlock / Edit' : 'Lock Picks'}
          </Text>
        </Pressable>
      </View>

      {matches.map(m => (
        <TodayMatchCard
          key={m.id}
          match={m}
          prediction={dailyPredictions[m.id]}
          locked={isTodayLocked}
          onOutcome={outcome => onOutcome(m.id, outcome)}
          onScoreChange={(field, val) => onScoreChange(m.id, field, val)}
          onNoteChange={(field, val) => onNoteChange(m.id, field, val)}
        />
      ))}

      <Text style={tdt.hint}>Make your picks, lock them in, and share with friends.</Text>
    </ScrollView>
  );
}

const tdt = StyleSheet.create({
  scroll:           { flex: 1 },
  content:          { paddingTop: 12, paddingBottom: 32 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: H_PAD, marginBottom: 12 },
  headerLabel:      { fontSize: 13, fontFamily: fonts.barlowBold, color: colors.textNavy, letterSpacing: 0.8 },
  lockBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder },
  lockBtnLocked:    { backgroundColor: colors.neutralSelected, borderColor: colors.neutralSelected },
  lockBtnPressed:   { opacity: 0.7 },
  lockBtnText:      { fontSize: 12, fontFamily: fonts.barlowSemi, color: colors.textSecondary, letterSpacing: 0.3 },
  lockBtnTextLocked:{ color: '#FFFFFF' },
  hint:             { textAlign: 'center', fontSize: 12, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.2, marginHorizontal: H_PAD, marginTop: 8 },
  emptyWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle:       { fontSize: 20, fontFamily: fonts.barlowBold, color: colors.textPrimary, textAlign: 'center', letterSpacing: 0.2 },
  emptySub:         { fontSize: 13, fontFamily: fonts.interRegular, color: colors.textMuted, textAlign: 'center', lineHeight: 18, letterSpacing: 0.2 },
});

// ── MatchPickRow ──────────────────────────────────────────────────────────────

function MatchPickRow({
  match, pick, locked, onPick,
}: {
  match: WC26Match;
  pick: MatchOutcome | undefined;
  locked: boolean;
  onPick: (outcome: MatchOutcome) => void;
}) {
  return (
    <View style={mpr.row}>
      <View style={mpr.teams}>
        <View style={mpr.teamLeft}>
          <TeamFlagImage flagUrl={getFlagUrl(match.homeTeam.code)} width={20} height={13} />
          <Text style={mpr.teamName} numberOfLines={1}>{match.homeTeam.name}</Text>
        </View>
        <Text style={mpr.vs}>vs</Text>
        <View style={mpr.teamRight}>
          <Text style={[mpr.teamName, mpr.teamNameRight]} numberOfLines={1}>{match.awayTeam.name}</Text>
          <TeamFlagImage flagUrl={getFlagUrl(match.awayTeam.code)} width={20} height={13} />
        </View>
      </View>
      <View style={mpr.buttons}>
        {(['home', 'draw', 'away'] as const).map(o => (
          <Pressable
            key={o}
            style={[mpr.btn, pick === o && mpr.btnSelected, locked && mpr.btnDisabled]}
            onPress={() => !locked && onPick(o)}
            disabled={locked}
          >
            <Text style={[mpr.btnText, pick === o && mpr.btnTextSelected]}>
              {o === 'home' ? match.homeTeam.code : o === 'away' ? match.awayTeam.code : 'Draw'}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const mpr = StyleSheet.create({
  row:            { paddingVertical: 10, paddingHorizontal: 14, gap: 8 },
  teams:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  teamLeft:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamRight:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  teamName:       { flex: 1, fontSize: 12, fontFamily: fonts.interMedium, color: colors.textPrimary, letterSpacing: 0.1 },
  teamNameRight:  { textAlign: 'right' },
  vs:             { fontSize: 10, fontFamily: fonts.barlowBold, color: colors.textMuted, paddingHorizontal: 4 },
  buttons:        { flexDirection: 'row', gap: 6 },
  btn:            { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: colors.neutralUnselected, borderWidth: 1, borderColor: colors.neutralBorder },
  btnSelected:    { backgroundColor: colors.neutralSelected, borderColor: colors.neutralSelected },
  btnDisabled:    { opacity: 0.45 },
  btnText:        { fontSize: 11, fontFamily: fonts.barlowSemi, color: colors.neutralText, letterSpacing: 0.5 },
  btnTextSelected:{ color: '#FFFFFF' },
});

// ── GroupSection ──────────────────────────────────────────────────────────────

function GroupSection({
  group, picks, lockedMatchIds, isExpanded, onToggle, onPick,
}: {
  group: string;
  picks: GroupPicks;
  lockedMatchIds: Set<string>;
  isExpanded: boolean;
  onToggle: () => void;
  onPick: (matchId: string, outcome: MatchOutcome) => void;
}) {
  const matches   = getGroupMatches(group);
  const pickCount = matches.filter(m => picks[m.id] !== undefined).length;

  return (
    <View style={gsc.container}>
      <Pressable style={gsc.header} onPress={onToggle} accessibilityRole="button">
        <View style={gsc.headerLeft}>
          <Text style={gsc.groupLabel}>GROUP {group}</Text>
          <Text style={gsc.progress}>{pickCount}/6</Text>
        </View>
        <ChevronSVG open={isExpanded} />
      </Pressable>
      {isExpanded && (
        <View style={gsc.body}>
          {matches.map((m, i) => (
            <React.Fragment key={m.id}>
              {i > 0 && <View style={gsc.divider} />}
              <MatchPickRow
                match={m}
                pick={picks[m.id]}
                locked={lockedMatchIds.has(m.id)}
                onPick={outcome => onPick(m.id, outcome)}
              />
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}

const gsc = StyleSheet.create({
  container:   { marginHorizontal: H_PAD, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, overflow: 'hidden' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groupLabel:  { fontSize: 14, fontFamily: fonts.barlowBold, color: colors.textNavy, letterSpacing: 1.5 },
  progress:    { fontSize: 11, fontFamily: fonts.interMedium, color: colors.textMuted, letterSpacing: 0.3 },
  body:        { borderTopWidth: 1, borderTopColor: colors.divider },
  divider:     { height: 1, backgroundColor: colors.divider, marginHorizontal: 14 },
});

// ── StandingsRow ──────────────────────────────────────────────────────────────

function StandingsRow({ stat, rank, showQualification }: { stat: TeamStats; rank: number; showQualification: boolean }) {
  const advances = showQualification && rank <= 2;
  const wildcard = showQualification && rank === 3;
  return (
    <View style={[sdr.row, advances && sdr.rowAdvances, wildcard && sdr.rowWildcard]}>
      {advances && <View style={sdr.stripeGreen} />}
      {wildcard  && <View style={sdr.stripeAmber} />}
      <TeamFlagImage flagUrl={getFlagUrl(stat.code)} width={20} height={13} />
      <Text style={sdr.name} numberOfLines={1}>{stat.name}</Text>
      <Text style={sdr.stat}>{stat.wins}</Text><Text style={sdr.statLabel}>W</Text>
      <Text style={sdr.stat}>{stat.draws}</Text><Text style={sdr.statLabel}>D</Text>
      <Text style={sdr.stat}>{stat.losses}</Text><Text style={sdr.statLabel}>L</Text>
      <Text style={[sdr.pts, stat.points > 0 && sdr.ptsActive]}>{stat.points}</Text>
      <View style={sdr.badge}>
        {advances && <Text style={sdr.badgeAdvances}>Advances</Text>}
        {wildcard  && <Text style={sdr.badgeWildcard}>Wildcard?</Text>}
      </View>
    </View>
  );
}

const sdr = StyleSheet.create({
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 14, gap: 6, position: 'relative' },
  rowAdvances:   { backgroundColor: '#F5FAF7' },
  rowWildcard:   { backgroundColor: '#FFFBF0' },
  stripeGreen:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.accent },
  stripeAmber:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.amber },
  name:          { flex: 1, fontSize: 12, fontFamily: fonts.interMedium, color: colors.textPrimary, letterSpacing: 0.1 },
  stat:          { fontSize: 12, fontFamily: fonts.interRegular, color: colors.textSecondary, width: 16, textAlign: 'center' },
  statLabel:     { fontSize: 10, fontFamily: fonts.interMedium, color: colors.textMuted, width: 14, textAlign: 'center' },
  pts:           { fontSize: 13, fontFamily: fonts.interSemi, color: colors.textMuted, width: 20, textAlign: 'center' },
  ptsActive:     { color: colors.accent },
  badge:         { width: 72, alignItems: 'flex-end' },
  badgeAdvances: { fontSize: 11, fontFamily: fonts.barlowSemi, color: colors.accent, letterSpacing: 0.3 },
  badgeWildcard: { fontSize: 10, fontFamily: fonts.barlowSemi, color: colors.amber, letterSpacing: 0.2 },
});

// ── GroupStandingsSection ─────────────────────────────────────────────────────

function GroupStandingsSection({ group, picks }: { group: string; picks: GroupPicks }) {
  const matches      = getGroupMatches(group);
  const standings    = computeStandings(matches, picks);
  const hasAnyPicks  = standings.some(s => s.played > 0);
  return (
    <View style={gss.container}>
      <View style={gss.header}>
        <Text style={gss.label}>GROUP {group}</Text>
        <View style={gss.line} />
      </View>
      <View style={gss.card}>
        <View style={gss.tableHeader}>
          <Text style={gss.colTeam}>Team</Text>
          <Text style={gss.colNum}>W</Text><Text style={gss.colNum}>D</Text><Text style={gss.colNum}>L</Text>
          <Text style={gss.colPts}>Pts</Text>
          {hasAnyPicks && <View style={{ width: 72 }} />}
        </View>
        {standings.map((stat, i) => (
          <React.Fragment key={stat.code}>
            {i > 0 && <View style={gss.divider} />}
            <StandingsRow stat={stat} rank={i + 1} showQualification={hasAnyPicks} />
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const gss = StyleSheet.create({
  container:   { marginHorizontal: H_PAD, marginBottom: 16 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  label:       { fontSize: 12, fontFamily: fonts.barlowBold, color: colors.textNavy, letterSpacing: 2 },
  line:        { flex: 1, height: 1, backgroundColor: colors.divider },
  card:        { borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 6 },
  colTeam:     { flex: 1, fontSize: 10, fontFamily: fonts.barlowSemi, color: colors.textMuted, letterSpacing: 0.5 },
  colNum:      { fontSize: 10, fontFamily: fonts.barlowSemi, color: colors.textMuted, width: 16, textAlign: 'center', letterSpacing: 0.3 },
  colPts:      { fontSize: 10, fontFamily: fonts.barlowSemi, color: colors.textMuted, width: 20, textAlign: 'center', letterSpacing: 0.3 },
  divider:     { height: 1, backgroundColor: colors.divider, marginHorizontal: 14 },
});

// ── GroupsContent ─────────────────────────────────────────────────────────────

function GroupsContent({
  picks, lockedMatchIds, onPick, onReset,
}: {
  picks: GroupPicks;
  lockedMatchIds: Set<string>;
  onPick: (matchId: string, outcome: MatchOutcome) => void;
  onReset: () => void;
}) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>('A');

  return (
    <ScrollView style={gc.scroll} contentContainerStyle={gc.content} showsVerticalScrollIndicator={false}>
      <View style={gc.sectionHeader}>
        <Text style={gc.sectionLabel}>MY PICKS</Text>
        <View style={gc.sectionLine} />
      </View>
      {GROUPS.map(g => (
        <GroupSection
          key={g} group={g} picks={picks} lockedMatchIds={lockedMatchIds}
          isExpanded={expandedGroup === g}
          onToggle={() => setExpandedGroup(prev => prev === g ? null : g)}
          onPick={onPick}
        />
      ))}
      <View style={[gc.sectionHeader, gc.sectionHeaderGap]}>
        <Text style={gc.sectionLabel}>MY STANDINGS</Text>
        <View style={gc.sectionLine} />
      </View>
      {GROUPS.map(g => <GroupStandingsSection key={g} group={g} picks={picks} />)}
      <Text style={gc.tiebreaker}>Tiebreakers simplified for MVP.</Text>
      <ResetButton onPress={onReset} />
    </ScrollView>
  );
}

const gc = StyleSheet.create({
  scroll:            { flex: 1 },
  content:           { paddingTop: 12, paddingBottom: 8 },
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: H_PAD, marginBottom: 10 },
  sectionHeaderGap:  { marginTop: 8 },
  sectionLabel:      { fontSize: 11, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 2 },
  sectionLine:       { flex: 1, height: 1, backgroundColor: colors.divider },
  tiebreaker:        { marginHorizontal: H_PAD, marginBottom: 4, fontSize: 11, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.3, fontStyle: 'italic' },
});

// ── Knockout data structures ──────────────────────────────────────────────────

type SlotSource = { t: 'gw'; g: string } | { t: 'gr'; g: string } | { t: 'b3'; r: number };
type KnockoutTeam = { code: string; name: string };
type KnockoutMatchup = { num: number; top: KnockoutTeam | null; bot: KnockoutTeam | null; topLbl: string; botLbl: string; winner: KnockoutTeam | null };

const R32_SLOTS: Array<{ num: number; ts: SlotSource; tl: string; bs: SlotSource; bl: string }> = [
  { num:73, ts:{t:'gr',g:'A'}, tl:'Group A Runner-up', bs:{t:'gr',g:'B'}, bl:'Group B Runner-up'  },
  { num:74, ts:{t:'gw',g:'E'}, tl:'Group E Winner',    bs:{t:'b3',r:1},   bl:'Best 3rd Place #1'  },
  { num:75, ts:{t:'gw',g:'F'}, tl:'Group F Winner',    bs:{t:'gr',g:'C'}, bl:'Group C Runner-up'  },
  { num:76, ts:{t:'gw',g:'C'}, tl:'Group C Winner',    bs:{t:'gr',g:'F'}, bl:'Group F Runner-up'  },
  { num:77, ts:{t:'gw',g:'I'}, tl:'Group I Winner',    bs:{t:'b3',r:2},   bl:'Best 3rd Place #2'  },
  { num:78, ts:{t:'gr',g:'E'}, tl:'Group E Runner-up', bs:{t:'gr',g:'I'}, bl:'Group I Runner-up'  },
  { num:79, ts:{t:'gw',g:'A'}, tl:'Group A Winner',    bs:{t:'b3',r:3},   bl:'Best 3rd Place #3'  },
  { num:80, ts:{t:'gw',g:'L'}, tl:'Group L Winner',    bs:{t:'b3',r:4},   bl:'Best 3rd Place #4'  },
  { num:81, ts:{t:'gw',g:'D'}, tl:'Group D Winner',    bs:{t:'b3',r:5},   bl:'Best 3rd Place #5'  },
  { num:82, ts:{t:'gw',g:'G'}, tl:'Group G Winner',    bs:{t:'b3',r:6},   bl:'Best 3rd Place #6'  },
  { num:83, ts:{t:'gr',g:'K'}, tl:'Group K Runner-up', bs:{t:'gr',g:'L'}, bl:'Group L Runner-up'  },
  { num:84, ts:{t:'gw',g:'H'}, tl:'Group H Winner',    bs:{t:'gr',g:'J'}, bl:'Group J Runner-up'  },
  { num:85, ts:{t:'gw',g:'B'}, tl:'Group B Winner',    bs:{t:'b3',r:7},   bl:'Best 3rd Place #7'  },
  { num:86, ts:{t:'gw',g:'J'}, tl:'Group J Winner',    bs:{t:'gr',g:'H'}, bl:'Group H Runner-up'  },
  { num:87, ts:{t:'gw',g:'K'}, tl:'Group K Winner',    bs:{t:'b3',r:8},   bl:'Best 3rd Place #8'  },
  { num:88, ts:{t:'gr',g:'D'}, tl:'Group D Runner-up', bs:{t:'gr',g:'G'}, bl:'Group G Runner-up'  },
];

const ADV: Record<number, [number, number]> = {
  89:[74,77], 90:[73,75], 91:[76,78], 92:[79,80],
  93:[83,84], 94:[81,82], 95:[86,88], 96:[85,87],
  97:[89,90], 98:[93,94], 99:[91,92], 100:[95,96],
  101:[97,98], 102:[99,100], 104:[101,102],
};

const KNOCKOUT_ROUNDS: Array<{ lbl: string; nums: number[]; two: boolean }> = [
  { lbl:'ROUND OF 32',   nums:[73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88], two:true  },
  { lbl:'ROUND OF 16',   nums:[89,90,91,92,93,94,95,96],                         two:true  },
  { lbl:'QUARTERFINALS', nums:[97,98,99,100],                                    two:true  },
  { lbl:'SEMIFINALS',    nums:[101,102],                                          two:false },
  { lbl:'FINAL',         nums:[104],                                              two:false },
];

function resolveSlot(src: SlotSource, gs: Map<string, TeamStats[]>, b3: TeamStats[]): KnockoutTeam | null {
  if (src.t === 'gw') { const s = gs.get(src.g); if (!s?.[0]) return null; return { code: s[0].code, name: s[0].name }; }
  if (src.t === 'gr') { const s = gs.get(src.g); if (!s?.[1]) return null; return { code: s[1].code, name: s[1].name }; }
  const t = b3[(src as { t: 'b3'; r: number }).r - 1]; return t ? { code: t.code, name: t.name } : null;
}

function buildKnockout(gp: GroupPicks, kp: Record<number, string>): Map<number, KnockoutMatchup> {
  const result = new Map<number, KnockoutMatchup>();
  const gs     = new Map<string, TeamStats[]>();
  for (const g of GROUPS) {
    const ms = getGroupMatches(g);
    if (ms.every(m => gp[m.id] !== undefined)) gs.set(g, computeStandings(ms, gp));
  }
  // TODO: Apply official FIFA 3rd-place pool matrix for accurate slot assignment
  const b3: TeamStats[] = [];
  for (const g of GROUPS) { const s = gs.get(g); if (s?.[2]) b3.push(s[2]); }
  b3.sort((a, b) => b.points !== a.points ? b.points - a.points : a.name.localeCompare(b.name));

  for (const slot of R32_SLOTS) {
    const top = resolveSlot(slot.ts, gs, b3);
    const bot = resolveSlot(slot.bs, gs, b3);
    const pc  = kp[slot.num];
    const winner: KnockoutTeam | null = pc ? (top?.code === pc ? top : bot?.code === pc ? bot : null) : null;
    result.set(slot.num, { num: slot.num, top, bot, topLbl: slot.tl, botLbl: slot.bl, winner });
  }
  for (const round of KNOCKOUT_ROUNDS.slice(1)) {
    for (const num of round.nums) {
      const feeders = ADV[num]; if (!feeders) continue;
      const [tf, bf] = feeders;
      const top = result.get(tf)?.winner ?? null;
      const bot = result.get(bf)?.winner ?? null;
      const pc  = kp[num];
      const winner: KnockoutTeam | null = pc ? (top?.code === pc ? top : bot?.code === pc ? bot : null) : null;
      result.set(num, { num, top, bot, topLbl: `Winner M${tf}`, botLbl: `Winner M${bf}`, winner });
    }
  }
  return result;
}

function getDownstream(matchNum: number): number[] {
  const result: number[] = [];
  for (const [m, [t, b]] of Object.entries(ADV)) {
    const mNum = +m;
    if (t === matchNum || b === matchNum) { result.push(mNum); result.push(...getDownstream(mNum)); }
  }
  return result;
}

function setKnockoutPick(picks: Record<number, string>, matchNum: number, winnerCode: string | null): Record<number, string> {
  const next = { ...picks };
  if (winnerCode === null) delete next[matchNum]; else next[matchNum] = winnerCode;
  for (const d of getDownstream(matchNum)) delete next[d];
  return next;
}

// ── KnockoutMatchupCard ───────────────────────────────────────────────────────

function KnockoutMatchupCard({ matchup, onPick }: { matchup: KnockoutMatchup; onPick: (code: string | null) => void }) {
  const { num, top, bot, topLbl, botLbl, winner } = matchup;
  const both = top !== null && bot !== null;

  const topIsWinner = winner !== null && top !== null && winner.code === top.code;
  const topIsLoser  = winner !== null && top !== null && winner.code !== top.code;
  const botIsWinner = winner !== null && bot !== null && winner.code === bot.code;
  const botIsLoser  = winner !== null && bot !== null && winner.code !== bot.code;
  const topTap = top !== null && (topIsWinner || (both && !winner));
  const botTap = bot !== null && (botIsWinner || (both && !winner));

  function tapTop() { if (!top) return; if (topIsWinner) onPick(null); else if (both && !winner) onPick(top.code); }
  function tapBot() { if (!bot) return; if (botIsWinner) onPick(null); else if (both && !winner) onPick(bot.code); }

  return (
    <View style={kmc.card}>
      <Text style={kmc.matchLabel}>M{num}</Text>
      {top ? (
        <Pressable style={({ pressed }) => [kmc.slot, topIsWinner && kmc.slotWin, topIsLoser && kmc.slotLose, topTap && pressed && kmc.slotPress]}
          onPress={tapTop} disabled={!topTap}
          accessibilityRole={topTap ? 'button' : 'text'}
          accessibilityLabel={topTap ? (topIsWinner ? `Deselect ${top.name}` : `Pick ${top.name}`) : top.name}
          accessibilityState={topIsWinner ? { selected: true } : undefined}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {topIsWinner && <View style={kmc.stripe} />}
          <TeamFlagImage flagUrl={getFlagUrl(top.code)} width={20} height={13} />
          <Text style={[kmc.teamName, topIsWinner && kmc.teamNameWin, topIsLoser && kmc.teamNameLose]} numberOfLines={1}>{top.name}</Text>
          {topIsWinner && <View style={kmc.checkWrap}><CheckIcon /></View>}
        </Pressable>
      ) : (
        <View style={[kmc.slot, kmc.slotEmpty]}><Text style={kmc.slotLabel} numberOfLines={1}>{topLbl}</Text></View>
      )}
      <View style={kmc.divider} />
      {bot ? (
        <Pressable style={({ pressed }) => [kmc.slot, botIsWinner && kmc.slotWin, botIsLoser && kmc.slotLose, botTap && pressed && kmc.slotPress]}
          onPress={tapBot} disabled={!botTap}
          accessibilityRole={botTap ? 'button' : 'text'}
          accessibilityLabel={botTap ? (botIsWinner ? `Deselect ${bot.name}` : `Pick ${bot.name}`) : bot.name}
          accessibilityState={botIsWinner ? { selected: true } : undefined}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {botIsWinner && <View style={kmc.stripe} />}
          <TeamFlagImage flagUrl={getFlagUrl(bot.code)} width={20} height={13} />
          <Text style={[kmc.teamName, botIsWinner && kmc.teamNameWin, botIsLoser && kmc.teamNameLose]} numberOfLines={1}>{bot.name}</Text>
          {botIsWinner && <View style={kmc.checkWrap}><CheckIcon /></View>}
        </Pressable>
      ) : (
        <View style={[kmc.slot, kmc.slotEmpty]}><Text style={kmc.slotLabel} numberOfLines={1}>{botLbl}</Text></View>
      )}
    </View>
  );
}

const kmc = StyleSheet.create({
  card:        { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  matchLabel:  { fontSize: 10, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 0.5, paddingHorizontal: 8, paddingTop: 5, paddingBottom: 2 },
  slot:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, gap: 8, minHeight: 40, position: 'relative' },
  slotWin:     { backgroundColor: colors.groupPillBg },
  slotLose:    { opacity: 0.38 },
  slotEmpty:   { paddingVertical: 10 },
  slotPress:   { opacity: 0.6 },
  stripe:      { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.accent },
  teamName:    { flex: 1, fontSize: 13, fontFamily: fonts.interMedium, color: colors.textPrimary, letterSpacing: 0.1 },
  teamNameWin: { fontFamily: fonts.barlowSemi, color: colors.accent },
  teamNameLose:{ color: colors.textSecondary },
  slotLabel:   { flex: 1, fontSize: 12, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.1 },
  checkWrap:   { width: 20, alignItems: 'center' },
  divider:     { height: 1, backgroundColor: colors.divider },
});

// ── KnockoutContent ───────────────────────────────────────────────────────────

function KnockoutContent({
  groupPicks, knockoutPicks, onPick,
}: {
  groupPicks: GroupPicks;
  knockoutPicks: Record<number, string>;
  onPick: (matchNum: number, code: string | null) => void;
}) {
  const bracket           = useMemo(() => buildKnockout(groupPicks, knockoutPicks), [groupPicks, knockoutPicks]);
  const totalGroup        = GROUP_STAGE_MATCHES.length;
  const pickedGroup       = Object.keys(groupPicks).length;
  const allPicked         = pickedGroup >= totalGroup;
  const champion          = bracket.get(104)?.winner ?? null;

  return (
    <ScrollView style={ko.scroll} contentContainerStyle={ko.content} showsVerticalScrollIndicator={false}>
      {!allPicked && (
        <View style={ko.banner}>
          <Text style={ko.bannerText}>Finish Group picks to fill in the bracket ({pickedGroup}/{totalGroup} picked)</Text>
        </View>
      )}
      {KNOCKOUT_ROUNDS.map(round => (
        <View key={round.lbl} style={ko.section}>
          <View style={ko.sectionHeader}>
            <Text style={ko.sectionLabel}>{round.lbl}</Text>
            <View style={ko.sectionLine} />
          </View>
          {round.two ? (
            <View style={ko.grid}>
              {round.nums.map(num => {
                const m = bracket.get(num); if (!m) return null;
                return <View key={num} style={{ width: CARD_W }}><KnockoutMatchupCard matchup={m} onPick={c => onPick(num, c)} /></View>;
              })}
            </View>
          ) : (
            <View style={ko.col}>
              {round.nums.map(num => {
                const m = bracket.get(num); if (!m) return null;
                return <KnockoutMatchupCard key={num} matchup={m} onPick={c => onPick(num, c)} />;
              })}
            </View>
          )}
        </View>
      ))}
      <View style={ko.section}>
        <View style={ko.sectionHeader}>
          <Text style={ko.sectionLabel}>CHAMPION</Text>
          <View style={ko.sectionLine} />
        </View>
        <View style={ko.champCard}>
          <View style={ko.champInner}>
            <TrophySVG />
            {champion ? (
              <View style={ko.champRow}>
                <TeamFlagImage flagUrl={getFlagUrl(champion.code)} width={28} height={18} />
                <Text style={ko.champName}>{champion.name}</Text>
              </View>
            ) : (
              <Text style={ko.champPlaceholder}>Pick your champion above</Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const ko = StyleSheet.create({
  scroll:         { flex: 1 },
  content:        { paddingTop: 12, paddingBottom: 32, paddingHorizontal: H_PAD },
  banner:         { backgroundColor: '#EBF4FF', borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  bannerText:     { fontSize: 13, color: '#1D4ED8', fontFamily: fonts.interMedium, letterSpacing: 0.2, lineHeight: 18 },
  section:        { marginBottom: 24 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionLabel:   { fontSize: 12, fontFamily: fonts.barlowBold, color: colors.textSecondary, letterSpacing: 2 },
  sectionLine:    { flex: 1, height: 1, backgroundColor: colors.divider },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', gap: COL_GAP },
  col:            { gap: 8 },
  champCard:      { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1.5, borderColor: colors.accent, shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  champInner:     { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 10 },
  champRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  champName:      { fontSize: 22, fontFamily: fonts.barlowBold, color: colors.textPrimary, letterSpacing: 0.3 },
  champPlaceholder:{ fontSize: 14, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.3 },
});

// ── BracketTab ────────────────────────────────────────────────────────────────

function BracketTab({
  groupPicks, knockoutPicks, lockedMatchIds, onGroupPick, onGroupReset, onKnockoutPick,
}: {
  groupPicks: GroupPicks;
  knockoutPicks: Record<number, string>;
  lockedMatchIds: Set<string>;
  onGroupPick: (matchId: string, outcome: MatchOutcome) => void;
  onGroupReset: () => void;
  onKnockoutPick: (matchNum: number, code: string | null) => void;
}) {
  const [section, setSection] = useState<BracketSection>('groups');

  return (
    <View style={bt.root}>
      <View style={bt.segWrapper}>
        {(['groups', 'knockout'] as const).map(s => (
          <Pressable
            key={s}
            style={[bt.seg, section === s && bt.segActive]}
            onPress={() => setSection(s)}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === s }}
          >
            <Text style={[bt.segText, section === s && bt.segTextActive]}>
              {s === 'groups' ? 'Groups' : 'Knockout'}
            </Text>
          </Pressable>
        ))}
      </View>
      {section === 'groups' ? (
        <GroupsContent
          picks={groupPicks}
          lockedMatchIds={lockedMatchIds}
          onPick={onGroupPick}
          onReset={onGroupReset}
        />
      ) : (
        <KnockoutContent
          groupPicks={groupPicks}
          knockoutPicks={knockoutPicks}
          onPick={onKnockoutPick}
        />
      )}
    </View>
  );
}

const bt = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  segWrapper:   { flexDirection: 'row', margin: 12, marginBottom: 4, backgroundColor: colors.divider, borderRadius: 10, padding: 2 },
  seg:          { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segActive:    { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 2 },
  segText:      { fontSize: 14, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 0.3 },
  segTextActive:{ color: colors.textPrimary },
});

// ── ShareCard (ViewShot target) ───────────────────────────────────────────────

type ShareCardProps = {
  todayPicks: WC26Match[];
  dailyPredictions: DailyPredictions;
  todayLabel: string;
  champion: KnockoutTeam | null;
  finalist1: KnockoutTeam | null;
  finalist2: KnockoutTeam | null;
  mode: 'daily' | 'bracket';
};

const ShareCard = React.forwardRef<View, ShareCardProps>(function ShareCard(
  { todayPicks, dailyPredictions, champion, finalist1, finalist2, mode },
  ref,
) {
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <View ref={ref} collapsable={false} style={sc.card}>
      {/* Multicolor ribbon */}
      <View style={sc.ribbon}>
        {PALETTE.map((color, i) => (
          <View key={i} style={[sc.ribbonBlock, { backgroundColor: color }]} />
        ))}
      </View>

      {/* Dark header */}
      <View style={sc.headerBar}>
        <Text style={sc.brand}>FUTBOL26</Text>
        <Text style={sc.brandDate}>{dateStr}</Text>
      </View>

      {mode === 'daily' && todayPicks.length > 0 && (
        <View style={sc.body}>
          <Text style={sc.sectionTitle}>Today's Picks</Text>
          {todayPicks.map((m, i) => {
            const p       = dailyPredictions[m.id]!;
            const outcome = p.outcome;
            const winText =
              outcome === 'home' ? `${m.homeTeam.name} wins` :
              outcome === 'away' ? `${m.awayTeam.name} wins` : 'Draw';
            const scoreStr =
              p.predictedHomeScore != null && p.predictedAwayScore != null
                ? `  ${p.predictedHomeScore}–${p.predictedAwayScore}` : '';
            return (
              <View key={m.id} style={[sc.pickRow, i > 0 && sc.pickRowBorder]}>
                <Text style={sc.matchLabel}>
                  {m.group ? `GROUP ${m.group}  ·  M${m.matchNumber}` : `M${m.matchNumber}`}
                </Text>
                <View style={sc.matchupRow}>
                  <TeamFlagImage flagUrl={getFlagUrl(m.homeTeam.code)} width={18} height={12} />
                  <Text style={sc.matchup} numberOfLines={1}>
                    {m.homeTeam.name} vs {m.awayTeam.name}
                  </Text>
                  <TeamFlagImage flagUrl={getFlagUrl(m.awayTeam.code)} width={18} height={12} />
                </View>
                <Text style={sc.result}>{winText}{scoreStr}</Text>
                {!!p.scorerNote && <Text style={sc.detail}>Scorer: {p.scorerNote}</Text>}
                {!!p.userNote   && <Text style={sc.detail}>{p.userNote}</Text>}
              </View>
            );
          })}
        </View>
      )}

      {mode === 'bracket' && (
        <View style={sc.body}>
          <Text style={sc.sectionTitle}>My Bracket</Text>
          {champion && (
            <View style={sc.pickRow}>
              <Text style={sc.matchLabel}>CHAMPION</Text>
              <Text style={sc.result}>{champion.name}</Text>
            </View>
          )}
          {(finalist1 || finalist2) && (
            <View style={[sc.pickRow, sc.pickRowBorder]}>
              <Text style={sc.matchLabel}>FINAL</Text>
              <Text style={sc.matchup}>{finalist1?.name ?? '?'} vs {finalist2?.name ?? '?'}</Text>
            </View>
          )}
        </View>
      )}

      {/* CTA */}
      <View style={sc.ctaRow}>
        <Text style={sc.ctaText}>Download FUTBOL26 to make your picks.</Text>
      </View>
    </View>
  );
});

const sc = StyleSheet.create({
  card:         { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder },
  ribbon:       { flexDirection: 'row', height: 5 },
  ribbonBlock:  { flex: 1 },
  headerBar:    { backgroundColor: colors.textPrimary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  brand:        { fontSize: 18, fontFamily: fonts.barlowBold, color: '#FFFFFF', letterSpacing: 1.5 },
  brandDate:    { fontSize: 12, fontFamily: fonts.interMedium, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.3 },
  body:         { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  sectionTitle: { fontSize: 11, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 2, marginBottom: 10 },
  pickRow:      { paddingVertical: 10 },
  pickRowBorder:{ borderTopWidth: 1, borderTopColor: colors.divider },
  matchLabel:   { fontSize: 10, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 1, marginBottom: 4 },
  matchupRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  matchup:      { flex: 1, fontSize: 13, fontFamily: fonts.interMedium, color: colors.textSecondary, letterSpacing: 0.1 },
  result:       { fontSize: 14, fontFamily: fonts.barlowBold, color: colors.textPrimary, letterSpacing: 0.2 },
  detail:       { fontSize: 11, fontFamily: fonts.interRegular, color: colors.textSecondary, letterSpacing: 0.1, marginTop: 2 },
  ctaRow:       { backgroundColor: colors.background, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.divider },
  ctaText:      { fontSize: 12, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.2, lineHeight: 17 },
});

// ── ShareTab ──────────────────────────────────────────────────────────────────

function ShareTab({
  dailyPredictions, groupPicks, knockoutPicks,
}: {
  dailyPredictions: DailyPredictions;
  groupPicks: GroupPicks;
  knockoutPicks: Record<number, string>;
}) {
  const bracket = useMemo(() => buildKnockout(groupPicks, knockoutPicks), [groupPicks, knockoutPicks]);
  const { matches: todayMatches, label: todayLabel } = useMemo(getTodayOrNextMatchday, []);
  const todayPicks = todayMatches.filter(m => dailyPredictions[m.id]?.outcome != null);

  const finalMatchup = bracket.get(104);
  const champion     = finalMatchup?.winner  ?? null;
  const finalist1    = finalMatchup?.top     ?? null;
  const finalist2    = finalMatchup?.bot     ?? null;

  const hasDailyPicks = todayPicks.length > 0;
  const hasBracket    = champion !== null || finalist1 !== null || finalist2 !== null;

  const dailyCardRef   = useRef<View>(null);
  const bracketCardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  async function handleShareImage(ref: React.RefObject<View | null>, fallbackText: string) {
    if (isSharing) return;
    setIsSharing(true);
    try {
      // captureRef types predate React 19's RefObject<T|null>; cast is safe
      const uri       = await captureRef(ref as React.RefObject<View>, { format: 'png', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share My FUTBOL26 Picks', UTI: 'public.png' });
      } else {
        Share.share({ message: fallbackText }).catch(() => {});
      }
    } catch {
      Share.share({ message: fallbackText }).catch(() => {});
    } finally {
      setIsSharing(false);
    }
  }

  function buildDailyText(): string {
    const lines = ['My 2026 World Cup Picks', todayLabel, ''];
    for (const m of todayPicks) {
      const p = dailyPredictions[m.id]!;
      const win = p.outcome === 'home' ? `${m.homeTeam.name} wins` : p.outcome === 'away' ? `${m.awayTeam.name} wins` : 'Draw';
      const score = p.predictedHomeScore != null && p.predictedAwayScore != null ? ` (${p.predictedHomeScore}-${p.predictedAwayScore})` : '';
      lines.push(`${m.homeTeam.name} vs ${m.awayTeam.name}: ${win}${score}`);
      if (p.scorerNote) lines.push(`  Scorer note: ${p.scorerNote}`);
      if (p.userNote)   lines.push(`  Note: ${p.userNote}`);
    }
    lines.push('', 'Built with FUTBOL26');
    return lines.join('\n');
  }

  function buildBracketText(): string {
    const lines = ['My 2026 World Cup Bracket', ''];
    if (champion) lines.push(`Champion: ${champion.name}`);
    if (finalist1 || finalist2) lines.push(`Final: ${finalist1?.name ?? '?'} vs ${finalist2?.name ?? '?'}`);
    lines.push('', 'Built with FUTBOL26');
    return lines.join('\n');
  }

  if (!hasDailyPicks && !hasBracket) {
    return (
      <View style={shr.emptyWrap}>
        <TrophySVG />
        <Text style={shr.emptyTitle}>No picks yet</Text>
        <Text style={shr.emptySub}>Make a pick on Today to generate your share card.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={shr.scroll} contentContainerStyle={shr.content} showsVerticalScrollIndicator={false}>
      {hasDailyPicks && (
        <View style={shr.section}>
          <Text style={shr.sectionLabel}>TODAY'S PICKS CARD</Text>
          <ShareCard
            ref={dailyCardRef}
            mode="daily"
            todayPicks={todayPicks}
            dailyPredictions={dailyPredictions}
            todayLabel={todayLabel}
            champion={null}
            finalist1={null}
            finalist2={null}
          />
          <Pressable
            style={({ pressed }) => [shr.shareBtn, pressed && shr.shareBtnPressed, isSharing && shr.shareBtnDisabled]}
            onPress={() => handleShareImage(dailyCardRef, buildDailyText())}
            disabled={isSharing}
            accessibilityRole="button"
            accessibilityLabel="Share today's picks"
          >
            <ShareSVG color="#FFFFFF" />
            <Text style={shr.shareBtnText}>{isSharing ? 'Preparing...' : 'Share My Picks'}</Text>
          </Pressable>
        </View>
      )}

      {hasBracket && (
        <View style={shr.section}>
          <Text style={shr.sectionLabel}>BRACKET CARD</Text>
          <ShareCard
            ref={bracketCardRef}
            mode="bracket"
            todayPicks={[]}
            dailyPredictions={dailyPredictions}
            todayLabel={todayLabel}
            champion={champion}
            finalist1={finalist1}
            finalist2={finalist2}
          />
          <Pressable
            style={({ pressed }) => [shr.shareBtn, pressed && shr.shareBtnPressed, isSharing && shr.shareBtnDisabled]}
            onPress={() => handleShareImage(bracketCardRef, buildBracketText())}
            disabled={isSharing}
            accessibilityRole="button"
            accessibilityLabel="Share bracket summary"
          >
            <ShareSVG color="#FFFFFF" />
            <Text style={shr.shareBtnText}>{isSharing ? 'Preparing...' : 'Share Full Bracket'}</Text>
          </Pressable>
        </View>
      )}

      <Text style={shr.imageNote}>
        Sharing as an image when available. Falls back to text if image sharing is unavailable.
      </Text>
    </ScrollView>
  );
}

const shr = StyleSheet.create({
  scroll:           { flex: 1 },
  content:          { paddingTop: 16, paddingBottom: 32, paddingHorizontal: H_PAD },
  emptyWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle:       { fontSize: 20, fontFamily: fonts.barlowBold, color: colors.textPrimary, textAlign: 'center', letterSpacing: 0.2 },
  emptySub:         { fontSize: 13, fontFamily: fonts.interRegular, color: colors.textMuted, textAlign: 'center', lineHeight: 18, letterSpacing: 0.2 },
  section:          { marginBottom: 24, gap: 12 },
  sectionLabel:     { fontSize: 11, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 2 },
  shareBtn:         { backgroundColor: colors.neutralSelected, borderRadius: 12, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48 },
  shareBtnPressed:  { opacity: 0.8 },
  shareBtnDisabled: { opacity: 0.5 },
  shareBtnText:     { fontSize: 15, fontFamily: fonts.barlowBold, color: '#FFFFFF', letterSpacing: 0.4 },
  imageNote:        { textAlign: 'center', fontSize: 11, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.2, lineHeight: 16 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export function MyBracketScreen() {
  const [subTab, setSubTab] = useState<SubTab>('today');

  const [groupPicks,    setGroupPicks]    = useState<GroupPicks>({});
  const [picksLoading,  setPicksLoading]  = useState(true);

  const [knockoutPicks,        setKnockoutPicks]        = useState<Record<number, string>>({});
  const [knockoutPicksLoading, setKnockoutPicksLoading] = useState(true);

  const [dailyPredictions, setDailyPredictions] = useState<DailyPredictions>({});
  const [dailyLoading,     setDailyLoading]     = useState(true);

  useEffect(() => {
    loadGroupPicks().then(gp      => { setGroupPicks(gp);        setPicksLoading(false); });
    loadKnockoutPicks().then(kp   => { setKnockoutPicks(kp);     setKnockoutPicksLoading(false); });
    loadDailyPredictions().then(dp => { setDailyPredictions(dp); setDailyLoading(false); });
  }, []);

  const lockedMatchIds = useMemo<Set<string>>(() => {
    const s = new Set<string>();
    for (const [id, pred] of Object.entries(dailyPredictions)) {
      if (pred.lockedAt != null) s.add(id);
    }
    return s;
  }, [dailyPredictions]);

  // ── Daily handlers ────────────────────────────────────────────────────────

  function handleDailyOutcome(matchId: string, outcome: DailyOutcome) {
    const current    = dailyPredictions[matchId] ?? emptyPrediction(matchId);
    if (current.lockedAt) return;
    const newOutcome = current.outcome === outcome ? null : outcome;
    const next       = { ...dailyPredictions, [matchId]: { ...current, outcome: newOutcome } };
    setDailyPredictions(next);
    saveDailyPredictions(next);
    if (GROUP_STAGE_MATCHES.some(m => m.id === matchId)) {
      const gNext = { ...groupPicks };
      if (newOutcome === null) delete gNext[matchId]; else gNext[matchId] = newOutcome;
      setGroupPicks(gNext);
      saveGroupPicks(gNext);
    }
  }

  function handleDailyScoreChange(matchId: string, field: 'predictedHomeScore' | 'predictedAwayScore', value: string) {
    const current = dailyPredictions[matchId] ?? emptyPrediction(matchId);
    if (current.lockedAt) return;
    let parsed: number | null;
    if (value === '') { parsed = null; } else { const n = parseInt(value, 10); if (isNaN(n) || n < 0) return; parsed = n; }
    const next = { ...dailyPredictions, [matchId]: { ...current, [field]: parsed } };
    setDailyPredictions(next);
    saveDailyPredictions(next);
  }

  function handleDailyNoteChange(matchId: string, field: 'scorerNote' | 'userNote', value: string) {
    const current = dailyPredictions[matchId] ?? emptyPrediction(matchId);
    if (current.lockedAt) return;
    const next = { ...dailyPredictions, [matchId]: { ...current, [field]: value } };
    setDailyPredictions(next);
    saveDailyPredictions(next);
  }

  function handleLockToday(matchIds: string[], lock: boolean) {
    const now  = lock ? new Date().toISOString() : null;
    const next = { ...dailyPredictions };
    for (const id of matchIds) {
      const current = next[id] ?? emptyPrediction(id);
      next[id] = { ...current, lockedAt: now };
    }
    setDailyPredictions(next);
    saveDailyPredictions(next);
  }

  // ── Group handlers ────────────────────────────────────────────────────────

  function handleGroupPick(matchId: string, outcome: MatchOutcome) {
    if (lockedMatchIds.has(matchId)) return;
    const next = { ...groupPicks };
    if (next[matchId] === outcome) delete next[matchId]; else next[matchId] = outcome;
    setGroupPicks(next);
    saveGroupPicks(next);
  }

  function handleGroupReset() {
    setGroupPicks({});
    saveGroupPicks({});
  }

  // ── Knockout handlers ─────────────────────────────────────────────────────

  function handleKnockoutPick(matchNum: number, code: string | null) {
    const next = setKnockoutPick(knockoutPicks, matchNum, code);
    setKnockoutPicks(next);
    saveKnockoutPicks(next);
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (picksLoading || knockoutPicksLoading || dailyLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <SubTabBar active={subTab} onPress={setSubTab} />

      {subTab === 'today' && (
        <TodayTab
          dailyPredictions={dailyPredictions}
          onOutcome={handleDailyOutcome}
          onScoreChange={handleDailyScoreChange}
          onNoteChange={handleDailyNoteChange}
          onLockToggle={handleLockToday}
        />
      )}

      {subTab === 'bracket' && (
        <BracketTab
          groupPicks={groupPicks}
          knockoutPicks={knockoutPicks}
          lockedMatchIds={lockedMatchIds}
          onGroupPick={handleGroupPick}
          onGroupReset={handleGroupReset}
          onKnockoutPick={handleKnockoutPick}
        />
      )}

      {subTab === 'share' && (
        <ShareTab
          dailyPredictions={dailyPredictions}
          groupPicks={groupPicks}
          knockoutPicks={knockoutPicks}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
