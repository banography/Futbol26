import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';
import { TeamFlagImage } from '../components/TeamFlagImage';
import { getFlagUrl } from '../services/futbolApi';
import { getAllTeams } from '../src/data/worldCup2026Squads';
import { WC26_MATCHES } from '../src/data/worldCup2026Matches';
import type { Match as WC26Match } from '../src/data/worldCup2026Matches';
import {
  type Bracket,
  type BracketPicks,
  type MatchupPick,
  type TeamEntry,
  emptyBracket,
  loadBracket,
  saveBracket,
} from '../services/bracketStorage';

// ── Constants ─────────────────────────────────────────────────────────────────

const SCREEN_W  = Dimensions.get('window').width;
const COL_GAP   = 8;
const H_PAD     = 16;
const CARD_W    = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;

const GROUPS          = ['A','B','C','D','E','F','G','H','I','J','K','L'] as const;
const GROUP_PICKS_KEY = 'bracket_group_picks';
const KNOCKOUT_KEY    = 'bracket_knockout_picks';

type RoundKey    = 'r16' | 'qf' | 'sf' | 'fin';
type SubTab      = 'group-picks' | 'standings' | 'knockout' | 'summary';
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
        teams.set(t.code, {
          code: t.code, name: t.name,
          played: 0, wins: 0, draws: 0, losses: 0, points: 0,
        });
      }
    }
  }

  for (const m of groupMatches) {
    const outcome = picks[m.id];
    if (!outcome) continue;
    const home = teams.get(m.homeTeam.code)!;
    const away = teams.get(m.awayTeam.code)!;
    home.played++;
    away.played++;
    if (outcome === 'home') {
      home.wins++;  home.points += 3;
      away.losses++;
    } else if (outcome === 'draw') {
      home.draws++;  home.points += 1;
      away.draws++;  away.points += 1;
    } else {
      away.wins++;  away.points += 3;
      home.losses++;
    }
  }

  return Array.from(teams.values()).sort((a, b) =>
    b.points !== a.points ? b.points - a.points : a.name.localeCompare(b.name),
  );
}

// ── Bracket mutation helpers ──────────────────────────────────────────────────

function clonePicks(picks: BracketPicks): BracketPicks {
  return JSON.parse(JSON.stringify(picks)) as BracketPicks;
}

function cascadeFromR16(p: BracketPicks, mIdx: number): BracketPicks {
  const qfIdx = Math.floor(mIdx / 2);
  const qfSlot: 'top' | 'bot' = mIdx % 2 === 0 ? 'top' : 'bot';
  p.qf[qfIdx][qfSlot] = null;
  p.qf[qfIdx].winner  = null;
  return cascadeFromQF(p, qfIdx);
}

function cascadeFromQF(p: BracketPicks, qfIdx: number): BracketPicks {
  const sfIdx = Math.floor(qfIdx / 2);
  const sfSlot: 'top' | 'bot' = qfIdx % 2 === 0 ? 'top' : 'bot';
  p.sf[sfIdx][sfSlot] = null;
  p.sf[sfIdx].winner  = null;
  return cascadeFromSF(p, sfIdx);
}

function cascadeFromSF(p: BracketPicks, sfIdx: number): BracketPicks {
  const finSlot: 'top' | 'bot' = sfIdx % 2 === 0 ? 'top' : 'bot';
  p.fin[0][finSlot]  = null;
  p.fin[0].winner    = null;
  p.champion         = null;
  return p;
}

function setR16Slot(
  picks: BracketPicks, mIdx: number, slot: 'top' | 'bot', team: TeamEntry | null,
): BracketPicks {
  const next = clonePicks(picks);
  next.r16[mIdx][slot]  = team;
  next.r16[mIdx].winner = null;
  return cascadeFromR16(next, mIdx);
}

function advanceWinner(
  picks: BracketPicks, round: RoundKey, mIdx: number, winner: TeamEntry,
): BracketPicks {
  const next = clonePicks(picks);
  next[round][mIdx].winner = winner;

  if (round === 'r16') {
    const qfIdx  = Math.floor(mIdx / 2);
    const qfSlot: 'top' | 'bot' = mIdx % 2 === 0 ? 'top' : 'bot';
    next.qf[qfIdx][qfSlot] = winner;
    next.qf[qfIdx].winner  = null;
    return cascadeFromQF(next, qfIdx);
  }
  if (round === 'qf') {
    const sfIdx:  number           = Math.floor(mIdx / 2);
    const sfSlot: 'top' | 'bot'   = mIdx % 2 === 0 ? 'top' : 'bot';
    next.sf[sfIdx][sfSlot] = winner;
    next.sf[sfIdx].winner  = null;
    return cascadeFromSF(next, sfIdx);
  }
  if (round === 'sf') {
    const finSlot: 'top' | 'bot' = mIdx % 2 === 0 ? 'top' : 'bot';
    next.fin[0][finSlot] = winner;
    next.fin[0].winner   = null;
    next.champion        = null;
    return next;
  }
  if (round === 'fin') {
    next.champion = winner;
    return next;
  }
  return next;
}

// ── Share text ────────────────────────────────────────────────────────────────

function buildShareText(b: Bracket): string {
  const p   = b.picks;
  const fmt = (m: MatchupPick) => m.winner?.name ?? '(TBD)';
  const lines: string[] = ['My 2026 World Cup Bracket', ''];
  lines.push('ROUND OF 16');
  p.r16.forEach((m, i) => lines.push(`  Match ${i + 1}: ${fmt(m)}`));
  lines.push('', 'QUARTERFINALS');
  p.qf.forEach((m, i) => lines.push(`  Match ${i + 1}: ${fmt(m)}`));
  lines.push('', 'SEMIFINALS');
  p.sf.forEach((m, i) => lines.push(`  Match ${i + 1}: ${fmt(m)}`));
  lines.push('', `FINAL: ${fmt(p.fin[0])}`);
  if (p.champion) lines.push('', `CHAMPION: ${p.champion.name}`);
  lines.push('', 'Built with FUTBOL26');
  return lines.join('\n');
}

function formatLockDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

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

function LockSVG({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 11V7a5 5 0 0110 0v4" stroke={colors.textSecondary} strokeWidth={1.8} strokeLinecap="round" />
      <Rect x={3} y={11} width={18} height={11} rx={3} stroke={colors.textSecondary} strokeWidth={1.8} fill={colors.divider} />
      <Circle cx={12} cy={17} r={1.5} fill={colors.textSecondary} />
    </Svg>
  );
}

function ShareSVG() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke={colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ── Sub-tab bar ───────────────────────────────────────────────────────────────

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'group-picks', label: 'My Picks' },
  { id: 'standings',   label: 'My Standings'   },
  { id: 'knockout',    label: 'My Knockout'    },
  { id: 'summary',     label: 'My Summary'     },
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
      <Pressable
        style={({ pressed }) => [rb.btn, pressed && rb.pressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Reset group picks"
      >
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

// ── MatchPickRow ──────────────────────────────────────────────────────────────

function MatchPickRow({
  match, pick, onPick,
}: {
  match: WC26Match;
  pick: MatchOutcome | undefined;
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
        <Pressable
          style={[mpr.btn, pick === 'home' && mpr.btnHomeSelected]}
          onPress={() => onPick(pick === 'home' ? 'home' : 'home')}
          onLongPress={() => {}}
        >
          <Text style={[mpr.btnText, pick === 'home' && mpr.btnTextSelected]}>
            {match.homeTeam.code}
          </Text>
        </Pressable>
        <Pressable
          style={[mpr.btn, pick === 'draw' && mpr.btnDrawSelected]}
          onPress={() => onPick('draw')}
        >
          <Text style={[mpr.btnText, pick === 'draw' && mpr.btnTextSelected]}>Draw</Text>
        </Pressable>
        <Pressable
          style={[mpr.btn, pick === 'away' && mpr.btnHomeSelected]}
          onPress={() => onPick('away')}
        >
          <Text style={[mpr.btnText, pick === 'away' && mpr.btnTextSelected]}>
            {match.awayTeam.code}
          </Text>
        </Pressable>
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
  btnHomeSelected:{ backgroundColor: colors.neutralSelected, borderColor: colors.neutralSelected },
  btnDrawSelected:{ backgroundColor: colors.neutralSelected, borderColor: colors.neutralSelected },
  btnText:        { fontSize: 11, fontFamily: fonts.barlowSemi, color: colors.neutralText, letterSpacing: 0.5 },
  btnTextSelected:{ color: '#FFFFFF' },
});

// ── GroupSection (collapsible) ────────────────────────────────────────────────

function GroupSection({
  group, picks, isExpanded, onToggle, onPick,
}: {
  group: string;
  picks: GroupPicks;
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
        <Text style={gsc.chevron}>{isExpanded ? '▲' : '▼'}</Text>
      </Pressable>
      {isExpanded && (
        <View style={gsc.body}>
          {matches.map((m, i) => (
            <React.Fragment key={m.id}>
              {i > 0 && <View style={gsc.divider} />}
              <MatchPickRow
                match={m}
                pick={picks[m.id]}
                onPick={(outcome) => onPick(m.id, outcome)}
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
  chevron:     { fontSize: 10, fontFamily: fonts.interRegular, color: colors.textMuted },
  body:        { borderTopWidth: 1, borderTopColor: colors.divider },
  divider:     { height: 1, backgroundColor: colors.divider, marginHorizontal: 14 },
});

// ── GroupPicksTab ─────────────────────────────────────────────────────────────

function GroupPicksTab({
  picks, onPick, onReset,
}: {
  picks: GroupPicks;
  onPick: (matchId: string, outcome: MatchOutcome) => void;
  onReset: () => void;
}) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>('A');

  function toggle(g: string) {
    setExpandedGroup(prev => prev === g ? null : g);
  }

  return (
    <ScrollView style={gpt.scroll} contentContainerStyle={gpt.content} showsVerticalScrollIndicator={false}>
      {GROUPS.map(g => (
        <GroupSection
          key={g}
          group={g}
          picks={picks}
          isExpanded={expandedGroup === g}
          onToggle={() => toggle(g)}
          onPick={onPick}
        />
      ))}
      <ResetButton onPress={onReset} />
    </ScrollView>
  );
}

const gpt = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { paddingTop: 12, paddingBottom: 8 },
});

// ── StandingsRow ──────────────────────────────────────────────────────────────

function StandingsRow({ stat, rank }: { stat: TeamStats; rank: number }) {
  const advances = rank <= 2;
  const wildcard = rank === 3;

  return (
    <View style={[sdr.row, advances && sdr.rowAdvances, wildcard && sdr.rowWildcard]}>
      {advances && <View style={sdr.stripeGreen} />}
      {wildcard  && <View style={sdr.stripeAmber} />}
      <TeamFlagImage flagUrl={getFlagUrl(stat.code)} width={20} height={13} />
      <Text style={sdr.name} numberOfLines={1}>{stat.name}</Text>
      <Text style={sdr.stat}>{stat.wins}</Text>
      <Text style={sdr.statLabel}>W</Text>
      <Text style={sdr.stat}>{stat.draws}</Text>
      <Text style={sdr.statLabel}>D</Text>
      <Text style={sdr.stat}>{stat.losses}</Text>
      <Text style={sdr.statLabel}>L</Text>
      <Text style={[sdr.pts, stat.points > 0 && sdr.ptsActive]}>{stat.points}</Text>
      <View style={sdr.badge}>
        {advances && <Text style={sdr.badgeAdvances}>Advances</Text>}
        {wildcard  && <Text style={sdr.badgeWildcard}>Potential wildcard</Text>}
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
  badge:         { width: 96, alignItems: 'flex-end' },
  badgeAdvances: { fontSize: 11, fontFamily: fonts.barlowSemi, color: colors.accent, letterSpacing: 0.3 },
  badgeWildcard: { fontSize: 10, fontFamily: fonts.barlowSemi, color: colors.amber, letterSpacing: 0.2 },
});

// ── GroupStandingsSection ─────────────────────────────────────────────────────

function GroupStandingsSection({ group, picks }: { group: string; picks: GroupPicks }) {
  const matches   = getGroupMatches(group);
  const standings = computeStandings(matches, picks);

  return (
    <View style={gss.container}>
      <View style={gss.header}>
        <Text style={gss.label}>GROUP {group}</Text>
        <View style={gss.line} />
      </View>
      <View style={gss.card}>
        <View style={gss.tableHeader}>
          <Text style={[gss.colTeam]}>Team</Text>
          <Text style={gss.colNum}>W</Text>
          <Text style={gss.colNum}>D</Text>
          <Text style={gss.colNum}>L</Text>
          <Text style={gss.colPts}>Pts</Text>
          <View style={{ width: 96 }} />
        </View>
        {standings.map((stat, i) => (
          <React.Fragment key={stat.code}>
            {i > 0 && <View style={gss.divider} />}
            <StandingsRow stat={stat} rank={i + 1} />
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

// ── StandingsTab ──────────────────────────────────────────────────────────────

function StandingsTab({ picks, onReset }: { picks: GroupPicks; onReset: () => void }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={sdt.content} showsVerticalScrollIndicator={false}>
      {GROUPS.map(g => (
        <GroupStandingsSection key={g} group={g} picks={picks} />
      ))}
      <View style={sdt.note}>
        <Text style={sdt.noteText}>Tiebreakers simplified for MVP.</Text>
      </View>
      <ResetButton onPress={onReset} />
    </ScrollView>
  );
}

const sdt = StyleSheet.create({
  content: { paddingTop: 16, paddingBottom: 8 },
  note:    { marginHorizontal: H_PAD, marginBottom: 4 },
  noteText:{ fontSize: 11, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.3, fontStyle: 'italic' },
});

// ── Coming soon placeholder ───────────────────────────────────────────────────

function ComingSoon({ label }: { label: string }) {
  return (
    <View style={cs.wrap}>
      <Text style={cs.title}>{label}</Text>
      <Text style={cs.sub}>Coming soon in a future update</Text>
    </View>
  );
}

const cs = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 17, fontFamily: fonts.barlowBold, color: colors.textPrimary, letterSpacing: 0.2 },
  sub:   { fontSize: 13, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.3 },
});

// ── Knockout bracket sub-components (unchanged) ───────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={es.container}>
      <TrophySVG />
      <Text style={es.headline}>Build your World Cup bracket</Text>
      <Text style={es.sub}>Pick teams for every round and call your champion</Text>
      <Pressable
        style={({ pressed }) => [es.btn, pressed && es.btnPressed]}
        onPress={onCreate}
        accessibilityRole="button"
        accessibilityLabel="Create bracket"
      >
        <Text style={es.btnText}>Create Bracket</Text>
      </Pressable>
    </View>
  );
}

const es = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  headline:  { fontSize: 20, fontFamily: fonts.barlowBold, color: colors.textPrimary, textAlign: 'center', letterSpacing: 0.2, marginTop: 4 },
  sub:       { fontSize: 14, fontFamily: fonts.interRegular, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, letterSpacing: 0.2 },
  btn:       { marginTop: 8, backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  btnPressed:{ opacity: 0.8 },
  btnText:   { fontSize: 15, fontFamily: fonts.barlowBold, color: '#FFFFFF', letterSpacing: 0.4 },
});

type TeamRowProps = {
  team: TeamEntry | null;
  isWinner: boolean; isLoser: boolean;
  canPick: boolean; canAdvance: boolean;
  locked: boolean;
  onPress: () => void;
};

function TeamRow({ team, isWinner, isLoser, canPick, canAdvance, locked, onPress }: TeamRowProps) {
  const pressable = !locked && (canPick || canAdvance);

  if (!team) {
    if (canPick) {
      return (
        <Pressable style={({ pressed }) => [tr.row, tr.emptyRow, pressed && tr.rowPressed]} onPress={onPress} accessibilityRole="button" accessibilityLabel="Pick a team">
          <View style={tr.emptyDot} />
          <Text style={tr.emptyText}>Pick a team</Text>
        </Pressable>
      );
    }
    return (
      <View style={[tr.row, tr.awaitingRow]}>
        <Text style={tr.awaitingText}>—</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [tr.row, isWinner && tr.winnerRow, isLoser && tr.loserRow, pressable && pressed && tr.rowPressed]}
      onPress={pressable ? onPress : undefined}
      accessibilityRole={pressable ? 'button' : 'text'}
      accessibilityLabel={pressable ? `Advance ${team.name}` : team.name}
      accessibilityState={isWinner ? { selected: true } : undefined}
    >
      {isWinner && <View style={tr.winnerStripe} />}
      <TeamFlagImage flagUrl={getFlagUrl(team.code)} width={22} height={14} />
      <Text style={[tr.teamName, isWinner && tr.winnerName, isLoser && tr.loserName]} numberOfLines={1}>{team.name}</Text>
      {isWinner && <View style={tr.checkWrap}><CheckIcon /></View>}
    </Pressable>
  );
}

const tr = StyleSheet.create({
  row:          { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, gap: 8, minHeight: 40, position: 'relative' },
  emptyRow:     { backgroundColor: colors.background },
  awaitingRow:  { backgroundColor: colors.background },
  winnerRow:    { backgroundColor: colors.groupPillBg },
  loserRow:     { opacity: 0.38 },
  rowPressed:   { opacity: 0.6 },
  winnerStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.accent, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  teamName:     { flex: 1, fontSize: 13, fontFamily: fonts.interMedium, color: colors.textPrimary, letterSpacing: 0.1 },
  winnerName:   { fontFamily: fonts.barlowSemi, color: colors.accent },
  loserName:    { color: colors.textSecondary },
  emptyDot:     { width: 6, height: 6, borderRadius: 3, borderWidth: 1.5, borderColor: colors.textMuted },
  emptyText:    { flex: 1, fontSize: 13, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.2 },
  awaitingText: { flex: 1, fontSize: 13, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.2 },
  checkWrap:    { width: 20, alignItems: 'center' },
});

type MatchupCardProps = {
  matchup: MatchupPick; round: RoundKey; mIdx: number;
  locked: boolean;
  onPickSlot: (slot: 'top' | 'bot') => void;
  onAdvance: (winner: TeamEntry) => void;
};

function MatchupCardFull({ matchup, round, mIdx, locked, onPickSlot, onAdvance }: MatchupCardProps) {
  const { top, bot, winner } = matchup;
  const bothFilled = top !== null && bot !== null;
  const isR16      = round === 'r16';

  function rowProps(team: TeamEntry | null): Omit<TeamRowProps, 'onPress'> {
    return {
      team,
      isWinner: winner !== null && winner.code === team?.code,
      isLoser:  winner !== null && winner.code !== team?.code,
      canPick:  isR16 && team === null,
      canAdvance: bothFilled && team !== null,
      locked,
    };
  }

  return (
    <View style={mc.card}>
      <TeamRow {...rowProps(top)} onPress={() => { if (isR16 && top === null) onPickSlot('top'); else if (bothFilled && !locked && top) onAdvance(top); }} />
      <View style={mc.divider} />
      <TeamRow {...rowProps(bot)} onPress={() => { if (isR16 && bot === null) onPickSlot('bot'); else if (bothFilled && !locked && bot) onAdvance(bot); }} />
    </View>
  );
}

const mc = StyleSheet.create({
  card:    { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  divider: { height: 1, backgroundColor: colors.divider },
});

type RoundSectionProps = {
  label: string; matchups: MatchupPick[]; round: RoundKey;
  twoCol: boolean; locked: boolean;
  onPickSlot: (mIdx: number, slot: 'top' | 'bot') => void;
  onAdvance: (round: RoundKey, mIdx: number, winner: TeamEntry) => void;
};

function RoundSection({ label, matchups, round, twoCol, locked, onPickSlot, onAdvance }: RoundSectionProps) {
  return (
    <View style={rss.section}>
      <View style={rss.header}>
        <Text style={rss.label}>{label}</Text>
        <View style={rss.line} />
      </View>
      {twoCol ? (
        <View style={rss.grid}>
          {matchups.map((m, i) => (
            <View key={i} style={{ width: CARD_W }}>
              <MatchupCardFull matchup={m} round={round} mIdx={i} locked={locked} onPickSlot={(slot) => onPickSlot(i, slot)} onAdvance={(w) => onAdvance(round, i, w)} />
            </View>
          ))}
        </View>
      ) : (
        <View style={rss.col}>
          {matchups.map((m, i) => (
            <MatchupCardFull key={i} matchup={m} round={round} mIdx={i} locked={locked} onPickSlot={(slot) => onPickSlot(i, slot)} onAdvance={(w) => onAdvance(round, i, w)} />
          ))}
        </View>
      )}
    </View>
  );
}

const rss = StyleSheet.create({
  section: { marginBottom: 24 },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label:   { fontSize: 12, fontFamily: fonts.barlowBold, color: colors.textSecondary, letterSpacing: 2 },
  line:    { flex: 1, height: 1, backgroundColor: colors.divider },
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: COL_GAP },
  col:     { gap: 8 },
});

function ChampionCard({ champion }: { champion: TeamEntry | null }) {
  return (
    <View style={champ.section}>
      <View style={rss.header}>
        <Text style={rss.label}>CHAMPION</Text>
        <View style={rss.line} />
      </View>
      <View style={champ.card}>
        <View style={champ.inner}>
          <TrophySVG />
          {champion ? (
            <View style={champ.teamRow}>
              <TeamFlagImage flagUrl={getFlagUrl(champion.code)} width={28} height={18} />
              <Text style={champ.teamName}>{champion.name}</Text>
            </View>
          ) : (
            <Text style={champ.placeholder}>Pick your champion above</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const champ = StyleSheet.create({
  section:     { marginBottom: 32 },
  card:        { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1.5, borderColor: colors.accent, shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  inner:       { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 10 },
  teamRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamName:    { fontSize: 20, fontFamily: fonts.barlowBold, color: colors.textPrimary, letterSpacing: 0.3 },
  placeholder: { fontSize: 14, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.3 },
});

type PickerTarget = { mIdx: number; slot: 'top' | 'bot' };
type TeamPickerProps = { visible: boolean; onClose: () => void; onSelect: (team: TeamEntry) => void };
const ALL_TEAMS = getAllTeams();

function TeamPickerModal({ visible, onClose, onSelect }: TeamPickerProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => query.trim() ? ALL_TEAMS.filter(t => t.teamName.toLowerCase().includes(query.toLowerCase())) : ALL_TEAMS,
    [query],
  );

  function handleClose() { setQuery(''); onClose(); }
  function handleSelect(t: { teamCode: string; teamName: string }) { setQuery(''); onSelect({ code: t.teamCode, name: t.teamName }); }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={pm.overlay}>
        <Pressable style={pm.backdrop} onPress={handleClose} />
        <View style={pm.sheet}>
          <View style={pm.handle} />
          <View style={pm.sheetHeader}>
            <Text style={pm.title}>Select a Team</Text>
            <Pressable style={pm.closeBtn} onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={pm.closeBtnText}>X</Text>
            </Pressable>
          </View>
          <View style={pm.searchRow}>
            <TextInput style={pm.searchInput} value={query} onChangeText={setQuery} placeholder="Search teams..." placeholderTextColor={colors.textMuted} autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" accessibilityLabel="Search teams" />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={item => item.teamCode}
            contentContainerStyle={pm.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={({ pressed }) => [pm.teamRow, pressed && pm.teamRowPressed]} onPress={() => handleSelect(item)} accessibilityRole="button" accessibilityLabel={`Select ${item.teamName}`}>
                <TeamFlagImage flagUrl={getFlagUrl(item.teamCode)} width={28} height={18} />
                <Text style={pm.teamName}>{item.teamName}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={pm.sep} />}
            ListEmptyComponent={<View style={pm.emptySearch}><Text style={pm.emptySearchText}>No teams found</Text></View>}
          />
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay:        { flex: 1, justifyContent: 'flex-end' },
  backdrop:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.42)' },
  sheet:          { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 24 },
  handle:         { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  title:          { fontSize: 16, fontFamily: fonts.barlowBold, color: colors.textPrimary, letterSpacing: 0.2 },
  closeBtn:       { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:   { fontSize: 14, fontFamily: fonts.barlowSemi, color: colors.textSecondary },
  searchRow:      { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput:    { backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.textPrimary, minHeight: 44 },
  listContent:    { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  teamRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 12, minHeight: 44 },
  teamRowPressed: { opacity: 0.55 },
  teamName:       { flex: 1, fontSize: 15, fontFamily: fonts.interMedium, color: colors.textPrimary, letterSpacing: 0.2 },
  sep:            { height: 1, backgroundColor: colors.divider },
  emptySearch:    { paddingVertical: 32, alignItems: 'center' },
  emptySearchText:{ fontSize: 14, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.3 },
});

function LockedBanner({ lockedAt }: { lockedAt: string }) {
  return (
    <View style={lb.banner}>
      <LockSVG size={14} />
      <Text style={lb.text}>Locked · {formatLockDate(lockedAt)}</Text>
    </View>
  );
}

const lb = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.divider, paddingHorizontal: 16, paddingVertical: 8 },
  text:   { fontSize: 12, fontFamily: fonts.interMedium, color: colors.textSecondary, letterSpacing: 0.3 },
});

type ActionBarProps = { bracket: Bracket; onLock: () => void; onEditCopy: () => void; onShare: () => void };

function ActionBar({ bracket, onLock, onEditCopy, onShare }: ActionBarProps) {
  const isDraft = bracket.state === 'draft';
  return (
    <View style={ab.bar}>
      {isDraft ? (
        <Pressable style={({ pressed }) => [ab.lockBtn, pressed && ab.btnPressed]} onPress={onLock} accessibilityRole="button" accessibilityLabel="Lock bracket">
          <LockSVG size={13} />
          <Text style={ab.lockText}>Lock Bracket</Text>
        </Pressable>
      ) : (
        <Pressable style={({ pressed }) => [ab.editBtn, pressed && ab.btnPressed]} onPress={onEditCopy} accessibilityRole="button" accessibilityLabel="Edit a copy">
          <Text style={ab.editText}>Edit Copy</Text>
        </Pressable>
      )}
      <Pressable style={({ pressed }) => [ab.shareBtn, pressed && ab.btnPressed]} onPress={onShare} accessibilityRole="button" accessibilityLabel="Share bracket">
        <ShareSVG />
        <Text style={ab.shareText}>Share</Text>
      </Pressable>
    </View>
  );
}

const ab = StyleSheet.create({
  bar:        { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider, backgroundColor: colors.card },
  lockBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder, minHeight: 40 },
  editBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder, minHeight: 40 },
  shareBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.groupPillBg, borderWidth: 1, borderColor: colors.accent, minHeight: 40 },
  btnPressed: { opacity: 0.65 },
  lockText:   { fontSize: 13, fontFamily: fonts.barlowSemi, color: colors.textSecondary, letterSpacing: 0.3 },
  editText:   { fontSize: 13, fontFamily: fonts.barlowSemi, color: colors.textSecondary, letterSpacing: 0.3 },
  shareText:  { fontSize: 13, fontFamily: fonts.barlowSemi, color: colors.accent, letterSpacing: 0.3 },
});

// ── Knockout data structures ──────────────────────────────────────────────────

type SlotSource =
  | { t: 'gw'; g: string }    // group winner
  | { t: 'gr'; g: string }    // group runner-up
  | { t: 'b3'; r: number };   // best 3rd (rank 1–8 simplified)

type KnockoutTeam = { code: string; name: string };
type KnockoutMatchup = {
  num: number;
  top: KnockoutTeam | null;
  bot: KnockoutTeam | null;
  topLbl: string;
  botLbl: string;
  winner: KnockoutTeam | null;
};

// R32 slot definitions (from official FIFA schedule):
const R32_SLOTS: Array<{
  num: number;
  ts: SlotSource; tl: string;
  bs: SlotSource; bl: string;
}> = [
  { num:73,  ts:{t:'gr',g:'A'}, tl:'Group A Runner-up',  bs:{t:'gr',g:'B'}, bl:'Group B Runner-up'  },
  { num:74,  ts:{t:'gw',g:'E'}, tl:'Group E Winner',     bs:{t:'b3',r:1},   bl:'Best 3rd Place #1'  },
  { num:75,  ts:{t:'gw',g:'F'}, tl:'Group F Winner',     bs:{t:'gr',g:'C'}, bl:'Group C Runner-up'  },
  { num:76,  ts:{t:'gw',g:'C'}, tl:'Group C Winner',     bs:{t:'gr',g:'F'}, bl:'Group F Runner-up'  },
  { num:77,  ts:{t:'gw',g:'I'}, tl:'Group I Winner',     bs:{t:'b3',r:2},   bl:'Best 3rd Place #2'  },
  { num:78,  ts:{t:'gr',g:'E'}, tl:'Group E Runner-up',  bs:{t:'gr',g:'I'}, bl:'Group I Runner-up'  },
  { num:79,  ts:{t:'gw',g:'A'}, tl:'Group A Winner',     bs:{t:'b3',r:3},   bl:'Best 3rd Place #3'  },
  { num:80,  ts:{t:'gw',g:'L'}, tl:'Group L Winner',     bs:{t:'b3',r:4},   bl:'Best 3rd Place #4'  },
  { num:81,  ts:{t:'gw',g:'D'}, tl:'Group D Winner',     bs:{t:'b3',r:5},   bl:'Best 3rd Place #5'  },
  { num:82,  ts:{t:'gw',g:'G'}, tl:'Group G Winner',     bs:{t:'b3',r:6},   bl:'Best 3rd Place #6'  },
  { num:83,  ts:{t:'gr',g:'K'}, tl:'Group K Runner-up',  bs:{t:'gr',g:'L'}, bl:'Group L Runner-up'  },
  { num:84,  ts:{t:'gw',g:'H'}, tl:'Group H Winner',     bs:{t:'gr',g:'J'}, bl:'Group J Runner-up'  },
  { num:85,  ts:{t:'gw',g:'B'}, tl:'Group B Winner',     bs:{t:'b3',r:7},   bl:'Best 3rd Place #7'  },
  { num:86,  ts:{t:'gw',g:'J'}, tl:'Group J Winner',     bs:{t:'gr',g:'H'}, bl:'Group H Runner-up'  },
  { num:87,  ts:{t:'gw',g:'K'}, tl:'Group K Winner',     bs:{t:'b3',r:8},   bl:'Best 3rd Place #8'  },
  { num:88,  ts:{t:'gr',g:'D'}, tl:'Group D Runner-up',  bs:{t:'gr',g:'G'}, bl:'Group G Runner-up'  },
];

// Advancement: match → [topFeeder, botFeeder]
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

// ── Knockout logic ────────────────────────────────────────────────────────────

function resolveSlot(
  src: SlotSource,
  groupStandings: Map<string, TeamStats[]>,
  best3rd: TeamStats[],
): KnockoutTeam | null {
  if (src.t === 'gw') {
    const standings = groupStandings.get(src.g);
    if (!standings || standings.length < 1) return null;
    const t = standings[0];
    return { code: t.code, name: t.name };
  }
  if (src.t === 'gr') {
    const standings = groupStandings.get(src.g);
    if (!standings || standings.length < 2) return null;
    const t = standings[1];
    return { code: t.code, name: t.name };
  }
  // b3
  const idx = (src as { t: 'b3'; r: number }).r - 1;
  const t = best3rd[idx];
  if (!t) return null;
  return { code: t.code, name: t.name };
}

function buildKnockout(
  groupPicks: GroupPicks,
  knockoutPicks: Record<number, string>,
): Map<number, KnockoutMatchup> {
  const result = new Map<number, KnockoutMatchup>();

  // Build standings for each group (only if all 6 matches are picked)
  const groupStandings = new Map<string, TeamStats[]>();
  for (const g of GROUPS) {
    const matches = getGroupMatches(g);
    const allPicked = matches.every(m => groupPicks[m.id] !== undefined);
    if (allPicked) {
      groupStandings.set(g, computeStandings(matches, groupPicks));
    }
  }

  // Best 3rd place teams: rank-3 from each group with complete standings, sorted pts desc then name asc
  // TODO: Apply official FIFA 3rd-place pool matrix for accurate slot assignment
  const best3rd: TeamStats[] = [];
  for (const g of GROUPS) {
    const standings = groupStandings.get(g);
    if (standings && standings.length >= 3) {
      best3rd.push(standings[2]);
    }
  }
  best3rd.sort((a, b) => b.points !== a.points ? b.points - a.points : a.name.localeCompare(b.name));

  // Build R32 matchups
  for (const slot of R32_SLOTS) {
    const top = resolveSlot(slot.ts, groupStandings, best3rd);
    const bot = resolveSlot(slot.bs, groupStandings, best3rd);
    const pickedCode = knockoutPicks[slot.num];
    let winner: KnockoutTeam | null = null;
    if (pickedCode) {
      if (top?.code === pickedCode) winner = top;
      else if (bot?.code === pickedCode) winner = bot;
    }
    result.set(slot.num, {
      num: slot.num,
      top,
      bot,
      topLbl: slot.tl,
      botLbl: slot.bl,
      winner,
    });
  }

  // Build R16 through Final via advancement
  for (const round of KNOCKOUT_ROUNDS.slice(1)) {
    for (const num of round.nums) {
      const feeders = ADV[num];
      if (!feeders) continue;
      const [topFeed, botFeed] = feeders;
      const topMatchup = result.get(topFeed);
      const botMatchup = result.get(botFeed);
      const top = topMatchup?.winner ?? null;
      const bot = botMatchup?.winner ?? null;
      const topLbl = topMatchup ? `Winner M${topFeed}` : `Winner M${topFeed}`;
      const botLbl = botMatchup ? `Winner M${botFeed}` : `Winner M${botFeed}`;
      const pickedCode = knockoutPicks[num];
      let winner: KnockoutTeam | null = null;
      if (pickedCode) {
        if (top?.code === pickedCode) winner = top;
        else if (bot?.code === pickedCode) winner = bot;
      }
      result.set(num, { num, top, bot, topLbl, botLbl, winner });
    }
  }

  return result;
}

function getDownstream(matchNum: number): number[] {
  const result: number[] = [];
  for (const [m, [t, b]] of Object.entries(ADV)) {
    const mNum = +m;
    if (t === matchNum || b === matchNum) {
      result.push(mNum);
      result.push(...getDownstream(mNum));
    }
  }
  return result;
}

function setKnockoutPick(
  picks: Record<number, string>,
  matchNum: number,
  winnerCode: string | null,
): Record<number, string> {
  const next = { ...picks };
  if (winnerCode === null) {
    delete next[matchNum];
  } else {
    next[matchNum] = winnerCode;
  }
  // Clear all downstream picks
  const downstream = getDownstream(matchNum);
  for (const d of downstream) {
    delete next[d];
  }
  return next;
}

// ── KnockoutMatchupCard ───────────────────────────────────────────────────────

function KnockoutMatchupCard({
  matchup,
  onPick,
}: {
  matchup: KnockoutMatchup;
  onPick: (code: string | null) => void;
}) {
  const { num, top, bot, topLbl, botLbl, winner } = matchup;
  const bothPresent = top !== null && bot !== null;

  function handleTopPress() {
    if (!top) return;
    if (winner?.code === top.code) {
      // Tap winner again to deselect
      onPick(null);
    } else if (bothPresent && winner === null) {
      onPick(top.code);
    }
  }

  function handleBotPress() {
    if (!bot) return;
    if (winner?.code === bot.code) {
      onPick(null);
    } else if (bothPresent && winner === null) {
      onPick(bot.code);
    }
  }

  const topIsWinner = winner !== null && top !== null && winner.code === top.code;
  const topIsLoser  = winner !== null && top !== null && winner.code !== top.code;
  const botIsWinner = winner !== null && bot !== null && winner.code === bot.code;
  const botIsLoser  = winner !== null && bot !== null && winner.code !== bot.code;

  const topTappable = top !== null && (topIsWinner || (bothPresent && winner === null));
  const botTappable = bot !== null && (botIsWinner || (bothPresent && winner === null));

  return (
    <View style={kmc.card}>
      <Text style={kmc.matchLabel}>M{num}</Text>
      {/* Top slot */}
      {top ? (
        <Pressable
          style={({ pressed }) => [
            kmc.slotRow,
            topIsWinner && kmc.slotWinner,
            topIsLoser  && kmc.slotLoser,
            topTappable && pressed && kmc.slotPressed,
          ]}
          onPress={handleTopPress}
          disabled={!topTappable}
          accessibilityRole={topTappable ? 'button' : 'text'}
          accessibilityLabel={topTappable ? (topIsWinner ? `Deselect ${top.name}` : `Pick ${top.name}`) : top.name}
          accessibilityState={topIsWinner ? { selected: true } : undefined}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {topIsWinner && <View style={kmc.winnerStripe} />}
          <TeamFlagImage flagUrl={getFlagUrl(top.code)} width={20} height={13} />
          <Text style={[kmc.teamName, topIsWinner && kmc.teamNameWinner, topIsLoser && kmc.teamNameLoser]} numberOfLines={1}>{top.name}</Text>
          {topIsWinner && <View style={kmc.checkWrap}><CheckIcon /></View>}
        </Pressable>
      ) : (
        <View style={[kmc.slotRow, kmc.slotEmpty]}>
          <Text style={kmc.slotLabel} numberOfLines={1}>{topLbl}</Text>
        </View>
      )}
      <View style={kmc.divider} />
      {/* Bottom slot */}
      {bot ? (
        <Pressable
          style={({ pressed }) => [
            kmc.slotRow,
            botIsWinner && kmc.slotWinner,
            botIsLoser  && kmc.slotLoser,
            botTappable && pressed && kmc.slotPressed,
          ]}
          onPress={handleBotPress}
          disabled={!botTappable}
          accessibilityRole={botTappable ? 'button' : 'text'}
          accessibilityLabel={botTappable ? (botIsWinner ? `Deselect ${bot.name}` : `Pick ${bot.name}`) : bot.name}
          accessibilityState={botIsWinner ? { selected: true } : undefined}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          {botIsWinner && <View style={kmc.winnerStripe} />}
          <TeamFlagImage flagUrl={getFlagUrl(bot.code)} width={20} height={13} />
          <Text style={[kmc.teamName, botIsWinner && kmc.teamNameWinner, botIsLoser && kmc.teamNameLoser]} numberOfLines={1}>{bot.name}</Text>
          {botIsWinner && <View style={kmc.checkWrap}><CheckIcon /></View>}
        </Pressable>
      ) : (
        <View style={[kmc.slotRow, kmc.slotEmpty]}>
          <Text style={kmc.slotLabel} numberOfLines={1}>{botLbl}</Text>
        </View>
      )}
    </View>
  );
}

const kmc = StyleSheet.create({
  card:          { backgroundColor: colors.card, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  matchLabel:    { fontSize: 10, fontFamily: fonts.barlowBold, color: colors.textMuted, letterSpacing: 0.5, paddingHorizontal: 8, paddingTop: 5, paddingBottom: 2 },
  slotRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, gap: 8, minHeight: 40, position: 'relative' },
  slotWinner:    { backgroundColor: colors.groupPillBg },
  slotLoser:     { opacity: 0.38 },
  slotEmpty:     { paddingVertical: 10 },
  slotPressed:   { opacity: 0.6 },
  winnerStripe:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.accent },
  teamName:      { flex: 1, fontSize: 13, fontFamily: fonts.interMedium, color: colors.textPrimary, letterSpacing: 0.1 },
  teamNameWinner:{ fontFamily: fonts.barlowSemi, color: colors.accent },
  teamNameLoser: { color: colors.textSecondary },
  slotLabel:     { flex: 1, fontSize: 12, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.1 },
  checkWrap:     { width: 20, alignItems: 'center' },
  divider:       { height: 1, backgroundColor: colors.divider },
});

// ── KnockoutTab ───────────────────────────────────────────────────────────────

function KnockoutTab({
  groupPicks,
  knockoutPicks,
  onPick,
}: {
  groupPicks: GroupPicks;
  knockoutPicks: Record<number, string>;
  onPick: (matchNum: number, code: string | null) => void;
}) {
  const bracket = useMemo(
    () => buildKnockout(groupPicks, knockoutPicks),
    [groupPicks, knockoutPicks],
  );

  const totalGroupMatches = GROUP_STAGE_MATCHES.length;
  const pickedGroupCount  = Object.keys(groupPicks).length;
  const allGroupsPicked   = pickedGroupCount >= totalGroupMatches;

  const finalMatchup = bracket.get(104);
  const champion     = finalMatchup?.winner ?? null;

  return (
    <ScrollView style={kt.scroll} contentContainerStyle={kt.content} showsVerticalScrollIndicator={false}>
      {!allGroupsPicked && (
        <View style={kt.infoBanner}>
          <Text style={kt.infoText}>
            Complete Group Picks to seed the bracket ({pickedGroupCount}/{totalGroupMatches} picked)
          </Text>
        </View>
      )}
      {KNOCKOUT_ROUNDS.map(round => (
        <View key={round.lbl} style={kt.roundSection}>
          <View style={kt.roundHeader}>
            <Text style={kt.roundLabel}>{round.lbl}</Text>
            <View style={kt.roundLine} />
          </View>
          {round.two ? (
            <View style={kt.grid}>
              {round.nums.map(num => {
                const matchup = bracket.get(num);
                if (!matchup) return null;
                return (
                  <View key={num} style={{ width: CARD_W }}>
                    <KnockoutMatchupCard
                      matchup={matchup}
                      onPick={(code) => onPick(num, code)}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={kt.col}>
              {round.nums.map(num => {
                const matchup = bracket.get(num);
                if (!matchup) return null;
                return (
                  <KnockoutMatchupCard
                    key={num}
                    matchup={matchup}
                    onPick={(code) => onPick(num, code)}
                  />
                );
              })}
            </View>
          )}
        </View>
      ))}
      {/* Champion card */}
      <View style={kt.championSection}>
        <View style={kt.roundHeader}>
          <Text style={kt.roundLabel}>CHAMPION</Text>
          <View style={kt.roundLine} />
        </View>
        <View style={kt.championCard}>
          <View style={kt.championInner}>
            <TrophySVG />
            {champion ? (
              <View style={kt.championTeamRow}>
                <TeamFlagImage flagUrl={getFlagUrl(champion.code)} width={28} height={18} />
                <Text style={kt.championName}>{champion.name}</Text>
              </View>
            ) : (
              <Text style={kt.championPlaceholder}>Pick your champion above</Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const kt = StyleSheet.create({
  scroll:             { flex: 1 },
  content:            { paddingTop: 12, paddingBottom: 32, paddingHorizontal: H_PAD },
  infoBanner:         { backgroundColor: '#EBF4FF', borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  infoText:           { fontSize: 13, color: '#1D4ED8', fontFamily: fonts.interMedium, letterSpacing: 0.2, lineHeight: 18 },
  roundSection:       { marginBottom: 24 },
  roundHeader:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  roundLabel:         { fontSize: 12, fontFamily: fonts.barlowBold, color: colors.textSecondary, letterSpacing: 2 },
  roundLine:          { flex: 1, height: 1, backgroundColor: colors.divider },
  grid:               { flexDirection: 'row', flexWrap: 'wrap', gap: COL_GAP },
  col:                { gap: 8 },
  championSection:    { marginBottom: 32 },
  championCard:       { backgroundColor: colors.card, borderRadius: 14, borderWidth: 1.5, borderColor: colors.accent, shadowColor: colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  championInner:      { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 10 },
  championTeamRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  championName:       { fontSize: 22, fontFamily: fonts.barlowBold, color: colors.textPrimary, letterSpacing: 0.3 },
  championPlaceholder:{ fontSize: 14, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.3 },
});

// ── SummaryTab ────────────────────────────────────────────────────────────────

function SummaryTab({
  groupPicks,
  knockoutPicks,
}: {
  groupPicks: GroupPicks;
  knockoutPicks: Record<number, string>;
}) {
  const bracket = useMemo(
    () => buildKnockout(groupPicks, knockoutPicks),
    [groupPicks, knockoutPicks],
  );

  const finalMatchup = bracket.get(104);
  const sf1Matchup   = bracket.get(101);
  const sf2Matchup   = bracket.get(102);

  const champion  = finalMatchup?.winner ?? null;
  const finalist1 = finalMatchup?.top    ?? null;
  const finalist2 = finalMatchup?.bot    ?? null;

  const sfTeams: KnockoutTeam[] = [];
  if (sf1Matchup?.top)  sfTeams.push(sf1Matchup.top);
  if (sf1Matchup?.bot)  sfTeams.push(sf1Matchup.bot);
  if (sf2Matchup?.top)  sfTeams.push(sf2Matchup.top);
  if (sf2Matchup?.bot)  sfTeams.push(sf2Matchup.bot);

  const hasAnything = champion !== null || finalist1 !== null || finalist2 !== null || sfTeams.length > 0;

  function handleShare() {
    const lines: string[] = ['My 2026 World Cup Picks', ''];
    lines.push(`Champion: ${champion?.name ?? '(TBD)'}`);
    lines.push(`Final: ${finalist1?.name ?? '(TBD)'} vs ${finalist2?.name ?? '(TBD)'}`);
    if (sfTeams.length > 0) {
      lines.push('Semifinalists:');
      sfTeams.forEach(t => lines.push(`  - ${t.name}`));
    }
    lines.push('', 'Built with FUTBOL26');
    Share.share({ message: lines.join('\n') }).catch(() => {});
  }

  if (!hasAnything) {
    return (
      <View style={sum.emptyWrap}>
        <TrophySVG />
        <Text style={sum.emptyTitle}>Make your picks first</Text>
        <Text style={sum.emptySub}>Fill in the Knockout tab to see your bracket summary</Text>
      </View>
    );
  }

  return (
    <ScrollView style={sum.scroll} contentContainerStyle={sum.content} showsVerticalScrollIndicator={false}>
      {/* Predicted Champion */}
      <View style={sum.card}>
        <Text style={sum.sectionLabel}>PREDICTED CHAMPION</Text>
        <View style={sum.divider} />
        <View style={sum.championContent}>
          <TrophySVG />
          {champion ? (
            <View style={sum.teamRowCentered}>
              <TeamFlagImage flagUrl={getFlagUrl(champion.code)} width={28} height={18} />
              <Text style={sum.championName}>{champion.name}</Text>
            </View>
          ) : (
            <Text style={sum.tbd}>Finish bracket to reveal</Text>
          )}
        </View>
      </View>

      {/* Final Matchup */}
      {(finalist1 !== null || finalist2 !== null) && (
        <View style={sum.card}>
          <Text style={sum.sectionLabel}>FINAL MATCHUP</Text>
          <View style={sum.divider} />
          <View style={sum.finalRow}>
            <View style={sum.finalistSide}>
              {finalist1 ? (
                <>
                  <TeamFlagImage flagUrl={getFlagUrl(finalist1.code)} width={28} height={18} />
                  <Text style={sum.finalistName} numberOfLines={2}>{finalist1.name}</Text>
                </>
              ) : (
                <Text style={sum.tbd}>TBD</Text>
              )}
            </View>
            <Text style={sum.vsText}>vs</Text>
            <View style={[sum.finalistSide, sum.finalistRight]}>
              {finalist2 ? (
                <>
                  <TeamFlagImage flagUrl={getFlagUrl(finalist2.code)} width={28} height={18} />
                  <Text style={[sum.finalistName, sum.finalistNameRight]} numberOfLines={2}>{finalist2.name}</Text>
                </>
              ) : (
                <Text style={sum.tbd}>TBD</Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Semifinalists */}
      {sfTeams.length > 0 && (
        <View style={sum.card}>
          <Text style={sum.sectionLabel}>SEMIFINALISTS</Text>
          <View style={sum.divider} />
          {sfTeams.map((t, i) => (
            <React.Fragment key={t.code}>
              {i > 0 && <View style={sum.rowDivider} />}
              <View style={sum.sfRow}>
                <TeamFlagImage flagUrl={getFlagUrl(t.code)} width={22} height={14} />
                <Text style={sum.sfName}>{t.name}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Share button */}
      <Pressable
        style={({ pressed }) => [sum.shareBtn, pressed && sum.shareBtnPressed]}
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel="Share my bracket"
      >
        <ShareSVG />
        <Text style={sum.shareBtnText}>Share My Bracket</Text>
      </Pressable>
    </ScrollView>
  );
}

const sum = StyleSheet.create({
  scroll:           { flex: 1 },
  content:          { paddingTop: 16, paddingBottom: 32, paddingHorizontal: H_PAD },
  emptyWrap:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle:       { fontSize: 20, fontFamily: fonts.barlowBold, color: colors.textPrimary, textAlign: 'center', letterSpacing: 0.2 },
  emptySub:         { fontSize: 13, fontFamily: fonts.interRegular, color: colors.textMuted, textAlign: 'center', lineHeight: 18, letterSpacing: 0.2 },
  card:             { backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16, overflow: 'hidden' },
  sectionLabel:     { fontSize: 12, fontFamily: fonts.barlowBold, color: colors.textNavy, letterSpacing: 2, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  divider:          { height: 1, backgroundColor: colors.divider },
  championContent:  { alignItems: 'center', paddingVertical: 20, paddingHorizontal: 16, gap: 10 },
  teamRowCentered:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  championName:     { fontSize: 22, fontFamily: fonts.barlowBold, color: colors.textPrimary, letterSpacing: 0.3 },
  tbd:              { fontSize: 14, fontFamily: fonts.interRegular, color: colors.textMuted, letterSpacing: 0.3, paddingVertical: 4 },
  finalRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 8 },
  finalistSide:     { flex: 1, alignItems: 'flex-start', gap: 6 },
  finalistRight:    { alignItems: 'flex-end' },
  finalistName:     { fontSize: 14, fontFamily: fonts.interSemi, color: colors.textPrimary, letterSpacing: 0.1 },
  finalistNameRight:{ textAlign: 'right' },
  vsText:           { fontSize: 13, fontFamily: fonts.barlowBold, color: colors.textMuted, paddingHorizontal: 4 },
  rowDivider:       { height: 1, backgroundColor: colors.divider, marginHorizontal: 14 },
  sfRow:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  sfName:           { flex: 1, fontSize: 14, fontFamily: fonts.interMedium, color: colors.textPrimary, letterSpacing: 0.1 },
  shareBtn:         { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, marginTop: 8 },
  shareBtnPressed:  { opacity: 0.8 },
  shareBtnText:     { fontSize: 16, fontFamily: fonts.barlowBold, color: '#FFFFFF', letterSpacing: 0.4 },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export function MyBracketScreen() {
  const [subTab, setSubTab] = useState<SubTab>('group-picks');

  // Group picks state
  const [groupPicks, setGroupPicks]       = useState<GroupPicks>({});
  const [picksLoading, setPicksLoading]   = useState(true);

  // Knockout picks state
  const [knockoutPicks, setKnockoutPicks]         = useState<Record<number, string>>({});
  const [knockoutPicksLoading, setKnockoutPicksLoading] = useState(true);

  // Old bracket state (kept for legacy orphaned components)
  const [bracket, setBracket]             = useState<Bracket | null>(null);
  const [bracketLoading, setBracketLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget]   = useState<PickerTarget | null>(null);

  useEffect(() => {
    loadGroupPicks().then(gp  => { setGroupPicks(gp);       setPicksLoading(false); });
    loadKnockoutPicks().then(kp => { setKnockoutPicks(kp);  setKnockoutPicksLoading(false); });
    loadBracket().then(b       => { setBracket(b);           setBracketLoading(false); });
  }, []);

  // ── Group picks handlers ──────────────────────────────────────────────────

  function handleGroupPick(matchId: string, outcome: MatchOutcome) {
    setGroupPicks(prev => {
      const next = { ...prev };
      if (next[matchId] === outcome) {
        delete next[matchId]; // tap same → deselect
      } else {
        next[matchId] = outcome;
      }
      saveGroupPicks(next);
      return next;
    });
  }

  function handleGroupReset() {
    setGroupPicks({});
    saveGroupPicks({});
  }

  // ── Knockout picks handlers ───────────────────────────────────────────────

  function handleKnockoutPick(matchNum: number, code: string | null) {
    setKnockoutPicks(prev => {
      const next = setKnockoutPick(prev, matchNum, code);
      saveKnockoutPicks(next);
      return next;
    });
  }

  // ── Old knockout bracket handlers (kept for orphaned components) ──────────

  const mutateBracket = useCallback((updater: (b: Bracket) => Bracket) => {
    setBracket(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      saveBracket(next);
      return next;
    });
  }, []);

  function handleCreate() {
    const b = emptyBracket();
    saveBracket(b);
    setBracket(b);
  }

  function handleOpenPicker(mIdx: number, slot: 'top' | 'bot') {
    setPickerTarget({ mIdx, slot });
    setPickerVisible(true);
  }

  function handleSelectTeam(team: TeamEntry) {
    setPickerVisible(false);
    if (!pickerTarget) return;
    const { mIdx, slot } = pickerTarget;
    mutateBracket(b => ({ ...b, picks: setR16Slot(b.picks, mIdx, slot, team) }));
    setPickerTarget(null);
  }

  function handleAdvance(round: RoundKey, mIdx: number, winner: TeamEntry) {
    mutateBracket(b => ({ ...b, picks: advanceWinner(b.picks, round, mIdx, winner) }));
  }

  function handleLock() {
    mutateBracket(b => ({ ...b, state: 'locked', lockedAt: new Date().toISOString() }));
  }

  function handleEditCopy() {
    mutateBracket(b => ({ ...b, id: Date.now().toString(), state: 'draft', lockedAt: null }));
  }

  function handleShare() {
    if (!bracket) return;
    Share.share({ message: buildShareText(bracket) }).catch(() => {});
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (picksLoading || knockoutPicksLoading || bracketLoading) {
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

      {subTab === 'group-picks' && (
        <GroupPicksTab picks={groupPicks} onPick={handleGroupPick} onReset={handleGroupReset} />
      )}

      {subTab === 'standings' && (
        <StandingsTab picks={groupPicks} onReset={handleGroupReset} />
      )}

      {subTab === 'knockout' && (
        <KnockoutTab
          groupPicks={groupPicks}
          knockoutPicks={knockoutPicks}
          onPick={handleKnockoutPick}
        />
      )}

      {subTab === 'summary' && (
        <SummaryTab
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

// Keep unused references to prevent tree-shaking of orphaned Phase-1 components
// (EmptyState, ChampionCard, RoundSection, MatchupCardFull, TeamPickerModal,
//  LockedBanner, ActionBar, handleCreate, handleOpenPicker, handleSelectTeam,
//  handleAdvance, handleLock, handleEditCopy, handleShare, pickerTarget,
//  pickerVisible, bracket — all intentionally retained)
void (EmptyState as unknown);
void (ChampionCard as unknown);
void (RoundSection as unknown);
void (MatchupCardFull as unknown);
void (TeamPickerModal as unknown);
void (LockedBanner as unknown);
void (ActionBar as unknown);
void (ComingSoon as unknown);
