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
import { TeamFlagImage } from '../components/TeamFlagImage';
import { getFlagUrl } from '../services/futbolApi';
import { getAllTeams } from '../src/data/worldCup2026Squads';
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

const SCREEN_W = Dimensions.get('window').width;
const COL_GAP   = 8;
const H_PAD     = 16;
const CARD_W    = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;

type RoundKey = 'r16' | 'qf' | 'sf' | 'fin';

// ── Bracket mutation helpers ──────────────────────────────────────────────────

function clonePicks(picks: BracketPicks): BracketPicks {
  return JSON.parse(JSON.stringify(picks)) as BracketPicks;
}

// Clear everything downstream from a given r16 matchup index
function cascadeFromR16(p: BracketPicks, mIdx: number): BracketPicks {
  const qfIdx = Math.floor(mIdx / 2);
  const qfSlot: 'top' | 'bot' = mIdx % 2 === 0 ? 'top' : 'bot';
  p.qf[qfIdx][qfSlot] = null;
  p.qf[qfIdx].winner = null;
  return cascadeFromQF(p, qfIdx);
}

function cascadeFromQF(p: BracketPicks, qfIdx: number): BracketPicks {
  const sfIdx = Math.floor(qfIdx / 2);
  const sfSlot: 'top' | 'bot' = qfIdx % 2 === 0 ? 'top' : 'bot';
  p.sf[sfIdx][sfSlot] = null;
  p.sf[sfIdx].winner = null;
  return cascadeFromSF(p, sfIdx);
}

function cascadeFromSF(p: BracketPicks, sfIdx: number): BracketPicks {
  const finSlot: 'top' | 'bot' = sfIdx % 2 === 0 ? 'top' : 'bot';
  p.fin[0][finSlot] = null;
  p.fin[0].winner = null;
  p.champion = null;
  return p;
}

function setR16Slot(
  picks: BracketPicks,
  mIdx: number,
  slot: 'top' | 'bot',
  team: TeamEntry | null,
): BracketPicks {
  const next = clonePicks(picks);
  next.r16[mIdx][slot] = team;
  next.r16[mIdx].winner = null;
  return cascadeFromR16(next, mIdx);
}

function advanceWinner(
  picks: BracketPicks,
  round: RoundKey,
  mIdx: number,
  winner: TeamEntry,
): BracketPicks {
  const next = clonePicks(picks);
  next[round][mIdx].winner = winner;

  if (round === 'r16') {
    const qfIdx = Math.floor(mIdx / 2);
    const qfSlot: 'top' | 'bot' = mIdx % 2 === 0 ? 'top' : 'bot';
    next.qf[qfIdx][qfSlot] = winner;
    next.qf[qfIdx].winner = null;
    return cascadeFromQF(next, qfIdx);
  }
  if (round === 'qf') {
    const sfIdx = Math.floor(mIdx / 2);
    const sfSlot: 'top' | 'bot' = mIdx % 2 === 0 ? 'top' : 'bot';
    next.sf[sfIdx][sfSlot] = winner;
    next.sf[sfIdx].winner = null;
    return cascadeFromSF(next, sfIdx);
  }
  if (round === 'sf') {
    const finSlot: 'top' | 'bot' = mIdx % 2 === 0 ? 'top' : 'bot';
    next.fin[0][finSlot] = winner;
    next.fin[0].winner = null;
    next.champion = null;
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
  const p = b.picks;
  const fmt = (m: MatchupPick) => m.winner?.name ?? '(TBD)';
  const lines: string[] = ['⚽ My 2026 World Cup Bracket', ''];

  lines.push('ROUND OF 16');
  p.r16.forEach((m, i) => lines.push(`  Match ${i + 1}: ${fmt(m)}`));
  lines.push('');
  lines.push('QUARTERFINALS');
  p.qf.forEach((m, i) => lines.push(`  Match ${i + 1}: ${fmt(m)}`));
  lines.push('');
  lines.push('SEMIFINALS');
  p.sf.forEach((m, i) => lines.push(`  Match ${i + 1}: ${fmt(m)}`));
  lines.push('');
  lines.push(`FINAL: ${fmt(p.fin[0])}`);
  if (p.champion) {
    lines.push('');
    lines.push(`🏆 CHAMPION: ${p.champion.name}`);
  }
  lines.push('');
  lines.push('Built with FUTBOL26');
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
      <Path
        d="M6 2h12v7a6 6 0 01-12 0V2z"
        fill={colors.groupPillBg}
        stroke={colors.accent}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path
        d="M2 3h4M18 3h4M2 7c0 2 1.5 3.5 4 3.5M22 7c0 2-1.5 3.5-4 3.5"
        stroke={colors.accent}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M12 13v4M8 21h8"
        stroke={colors.accent}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Rect x={9} y={17} width={6} height={1.5} rx={0.75} fill={colors.accent} />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12l5 5L20 7"
        stroke={colors.accent}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LockSVG({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 11V7a5 5 0 0110 0v4"
        stroke={colors.textSecondary}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Rect
        x={3} y={11} width={18} height={11} rx={3}
        stroke={colors.textSecondary}
        strokeWidth={1.8}
        fill={colors.divider}
      />
      <Circle cx={12} cy={17} r={1.5} fill={colors.textSecondary} />
    </Svg>
  );
}

function ShareSVG() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
        stroke={colors.accent}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

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
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  headline: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  sub: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  btn: {
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.8 },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
});

// ── Team row ──────────────────────────────────────────────────────────────────

type TeamRowProps = {
  team: TeamEntry | null;
  isWinner: boolean;
  isLoser: boolean;
  canPick: boolean;       // true when row is R16 empty slot
  canAdvance: boolean;    // true when row is a filled team in a ready matchup
  locked: boolean;
  onPress: () => void;
};

function TeamRow({ team, isWinner, isLoser, canPick, canAdvance, locked, onPress }: TeamRowProps) {
  const pressable = !locked && (canPick || canAdvance);

  if (!team) {
    if (canPick) {
      return (
        <Pressable
          style={({ pressed }) => [tr.row, tr.emptyRow, pressed && tr.rowPressed]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Pick a team"
          accessibilityHint="Opens team selector"
        >
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
      style={({ pressed }) => [
        tr.row,
        isWinner && tr.winnerRow,
        isLoser && tr.loserRow,
        pressable && pressed && tr.rowPressed,
      ]}
      onPress={pressable ? onPress : undefined}
      accessibilityRole={pressable ? 'button' : 'text'}
      accessibilityLabel={pressable ? `Advance ${team.name}` : team.name}
      accessibilityState={isWinner ? { selected: true } : undefined}
    >
      {isWinner && <View style={tr.winnerStripe} />}
      <TeamFlagImage
        flagUrl={getFlagUrl(team.code)}
        width={22}
        height={14}
      />
      <Text
        style={[tr.teamName, isWinner && tr.winnerName, isLoser && tr.loserName]}
        numberOfLines={1}
      >
        {team.name}
      </Text>
      {isWinner && (
        <View style={tr.checkWrap}>
          <CheckIcon />
        </View>
      )}
    </Pressable>
  );
}

const tr = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
    minHeight: 40,
    position: 'relative',
  },
  emptyRow: {
    backgroundColor: colors.background,
  },
  awaitingRow: {
    backgroundColor: colors.background,
  },
  winnerRow: {
    backgroundColor: colors.groupPillBg,
  },
  loserRow: {
    opacity: 0.38,
  },
  rowPressed: { opacity: 0.6 },
  winnerStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  teamName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  winnerName: {
    fontWeight: '700',
    color: colors.accent,
  },
  loserName: {
    color: colors.textSecondary,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  awaitingText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  checkWrap: {
    width: 20,
    alignItems: 'center',
  },
});

// ── Matchup card ──────────────────────────────────────────────────────────────

type MatchupCardProps = {
  matchup: MatchupPick;
  round: RoundKey;
  mIdx: number;
  locked: boolean;
  onPickSlot: (slot: 'top' | 'bot') => void;
  onAdvance: (winner: TeamEntry) => void;
};

function MatchupCardFull({ matchup, round, mIdx, locked, onPickSlot, onAdvance }: MatchupCardProps) {
  const { top, bot, winner } = matchup;
  const bothFilled = top !== null && bot !== null;
  const isR16 = round === 'r16';

  function rowProps(team: TeamEntry | null, slot: 'top' | 'bot'): Omit<TeamRowProps, 'onPress'> {
    return {
      team,
      isWinner: winner !== null && winner.code === team?.code,
      isLoser: winner !== null && winner.code !== team?.code,
      canPick: isR16 && team === null,
      canAdvance: bothFilled && team !== null,
      locked,
    };
  }

  return (
    <View style={mc.card}>
      <TeamRow
        {...rowProps(top, 'top')}
        onPress={() => {
          if (isR16 && top === null) onPickSlot('top');
          else if (bothFilled && !locked && top) onAdvance(top);
        }}
      />
      <View style={mc.divider} />
      <TeamRow
        {...rowProps(bot, 'bot')}
        onPress={() => {
          if (isR16 && bot === null) onPickSlot('bot');
          else if (bothFilled && !locked && bot) onAdvance(bot);
        }}
      />
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
});

// ── Round section ─────────────────────────────────────────────────────────────

type RoundSectionProps = {
  label: string;
  matchups: MatchupPick[];
  round: RoundKey;
  twoCol: boolean;
  locked: boolean;
  onPickSlot: (mIdx: number, slot: 'top' | 'bot') => void;
  onAdvance: (round: RoundKey, mIdx: number, winner: TeamEntry) => void;
};

function RoundSection({ label, matchups, round, twoCol, locked, onPickSlot, onAdvance }: RoundSectionProps) {
  return (
    <View style={rs.section}>
      <View style={rs.header}>
        <Text style={rs.label}>{label}</Text>
        <View style={rs.line} />
      </View>
      {twoCol ? (
        <View style={rs.grid}>
          {matchups.map((m, i) => (
            <View key={i} style={{ width: CARD_W }}>
              <MatchupCardFull
                matchup={m}
                round={round}
                mIdx={i}
                locked={locked}
                onPickSlot={(slot) => onPickSlot(i, slot)}
                onAdvance={(winner) => onAdvance(round, i, winner)}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={rs.col}>
          {matchups.map((m, i) => (
            <MatchupCardFull
              key={i}
              matchup={m}
              round={round}
              mIdx={i}
              locked={locked}
              onPickSlot={(slot) => onPickSlot(i, slot)}
              onAdvance={(winner) => onAdvance(round, i, winner)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const rs = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: COL_GAP,
  },
  col: {
    gap: 8,
  },
});

// ── Champion card ─────────────────────────────────────────────────────────────

function ChampionCard({ champion }: { champion: TeamEntry | null }) {
  return (
    <View style={ch.section}>
      <View style={rs.header}>
        <Text style={rs.label}>CHAMPION</Text>
        <View style={rs.line} />
      </View>
      <View style={ch.card}>
        <View style={ch.inner}>
          <TrophySVG />
          {champion ? (
            <View style={ch.teamRow}>
              <TeamFlagImage flagUrl={getFlagUrl(champion.code)} width={28} height={18} />
              <Text style={ch.teamName}>{champion.name}</Text>
            </View>
          ) : (
            <Text style={ch.placeholder}>Pick your champion above</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const ch = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  inner: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 10,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  placeholder: {
    fontSize: 14,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});

// ── Team picker modal ─────────────────────────────────────────────────────────

type PickerTarget = { mIdx: number; slot: 'top' | 'bot' };

type TeamPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (team: TeamEntry) => void;
};

const ALL_TEAMS = getAllTeams();

function TeamPickerModal({ visible, onClose, onSelect }: TeamPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () =>
      query.trim()
        ? ALL_TEAMS.filter(t =>
            t.teamName.toLowerCase().includes(query.toLowerCase()),
          )
        : ALL_TEAMS,
    [query],
  );

  function handleClose() {
    setQuery('');
    onClose();
  }

  function handleSelect(t: { teamCode: string; teamName: string }) {
    setQuery('');
    onSelect({ code: t.teamCode, name: t.teamName });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={pm.overlay}>
        <Pressable style={pm.backdrop} onPress={handleClose} />
        <View style={pm.sheet}>
          {/* Handle bar */}
          <View style={pm.handle} />

          {/* Header */}
          <View style={pm.sheetHeader}>
            <Text style={pm.title}>Select a Team</Text>
            <Pressable
              style={pm.closeBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={pm.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Search */}
          <View style={pm.searchRow}>
            <TextInput
              style={pm.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search teams..."
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
              accessibilityLabel="Search teams"
            />
          </View>

          {/* Team list */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.teamCode}
            contentContainerStyle={pm.listContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [pm.teamRow, pressed && pm.teamRowPressed]}
                onPress={() => handleSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.teamName}`}
              >
                <TeamFlagImage
                  flagUrl={getFlagUrl(item.teamCode)}
                  width={28}
                  height={18}
                />
                <Text style={pm.teamName}>{item.teamName}</Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={pm.sep} />}
            ListEmptyComponent={
              <View style={pm.emptySearch}>
                <Text style={pm.emptySearchText}>No teams found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 44,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
    minHeight: 44,
  },
  teamRowPressed: { opacity: 0.55 },
  teamName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  sep: {
    height: 1,
    backgroundColor: colors.divider,
  },
  emptySearch: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 14,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});

// ── Locked banner ─────────────────────────────────────────────────────────────

function LockedBanner({ lockedAt }: { lockedAt: string }) {
  return (
    <View style={lb.banner}>
      <LockSVG size={14} />
      <Text style={lb.text}>Locked · {formatLockDate(lockedAt)}</Text>
    </View>
  );
}

const lb = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  text: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

// ── Action bar ────────────────────────────────────────────────────────────────

type ActionBarProps = {
  bracket: Bracket;
  onLock: () => void;
  onEditCopy: () => void;
  onShare: () => void;
};

function ActionBar({ bracket, onLock, onEditCopy, onShare }: ActionBarProps) {
  const isDraft = bracket.state === 'draft';

  return (
    <View style={ab.bar}>
      {isDraft ? (
        <Pressable
          style={({ pressed }) => [ab.lockBtn, pressed && ab.btnPressed]}
          onPress={onLock}
          accessibilityRole="button"
          accessibilityLabel="Lock bracket"
        >
          <LockSVG size={13} />
          <Text style={ab.lockText}>Lock Bracket</Text>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [ab.editBtn, pressed && ab.btnPressed]}
          onPress={onEditCopy}
          accessibilityRole="button"
          accessibilityLabel="Edit a copy of this bracket"
        >
          <Text style={ab.editText}>Edit Copy</Text>
        </Pressable>
      )}
      <Pressable
        style={({ pressed }) => [ab.shareBtn, pressed && ab.btnPressed]}
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel="Share bracket"
      >
        <ShareSVG />
        <Text style={ab.shareText}>Share</Text>
      </Pressable>
    </View>
  );
}

const ab = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.card,
  },
  lockBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 40,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 40,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.groupPillBg,
    borderWidth: 1,
    borderColor: colors.accent,
    minHeight: 40,
  },
  btnPressed: { opacity: 0.65 },
  lockText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  editText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  shareText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.3,
  },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export function MyBracketScreen() {
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);

  useEffect(() => {
    loadBracket().then(b => {
      setBracket(b);
      setLoading(false);
    });
  }, []);

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
    mutateBracket(b => ({
      ...b,
      picks: setR16Slot(b.picks, mIdx, slot, team),
    }));
    setPickerTarget(null);
  }

  function handleAdvance(round: RoundKey, mIdx: number, winner: TeamEntry) {
    mutateBracket(b => ({
      ...b,
      picks: advanceWinner(b.picks, round, mIdx, winner),
    }));
  }

  function handleLock() {
    mutateBracket(b => ({
      ...b,
      state: 'locked',
      lockedAt: new Date().toISOString(),
    }));
  }

  function handleEditCopy() {
    mutateBracket(b => ({
      ...b,
      id: Date.now().toString(),
      state: 'draft',
      lockedAt: null,
    }));
  }

  function handleShare() {
    if (!bracket) return;
    const message = buildShareText(bracket);
    Share.share({ message }).catch(() => {/* user dismissed */});
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (!bracket) {
    return <EmptyState onCreate={handleCreate} />;
  }

  const locked = bracket.state === 'locked';
  const { picks } = bracket;

  return (
    <View style={s.root}>
      <ActionBar
        bracket={bracket}
        onLock={handleLock}
        onEditCopy={handleEditCopy}
        onShare={handleShare}
      />

      {locked && bracket.lockedAt && (
        <LockedBanner lockedAt={bracket.lockedAt} />
      )}

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <RoundSection
          label="ROUND OF 16"
          matchups={picks.r16}
          round="r16"
          twoCol
          locked={locked}
          onPickSlot={(mIdx, slot) => handleOpenPicker(mIdx, slot)}
          onAdvance={handleAdvance}
        />
        <RoundSection
          label="QUARTERFINALS"
          matchups={picks.qf}
          round="qf"
          twoCol
          locked={locked}
          onPickSlot={() => {}}
          onAdvance={handleAdvance}
        />
        <RoundSection
          label="SEMIFINALS"
          matchups={picks.sf}
          round="sf"
          twoCol={false}
          locked={locked}
          onPickSlot={() => {}}
          onAdvance={handleAdvance}
        />
        <RoundSection
          label="FINAL"
          matchups={picks.fin}
          round="fin"
          twoCol={false}
          locked={locked}
          onPickSlot={() => {}}
          onAdvance={handleAdvance}
        />
        <ChampionCard champion={picks.champion} />
      </ScrollView>

      <TeamPickerModal
        visible={pickerVisible}
        onClose={() => { setPickerVisible(false); setPickerTarget(null); }}
        onSelect={handleSelectTeam}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
