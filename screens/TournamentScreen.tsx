import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';
import { TeamFlagImage } from '../components/TeamFlagImage';
import { getFlagUrl } from '../services/futbolApi';
import type { Match as WC26Match } from '../src/data/worldCup2026Matches';
import { useMatchData } from '../services/matchDataService';

// ── Types ─────────────────────────────────────────────────────────────────────

type Segment = 'standings' | 'bracket';

// ── Standings constants ───────────────────────────────────────────────────────

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'] as const;

type GroupTeamStats = {
  code:   string;
  name:   string;
  played: number;
  wins:   number;
  draws:  number;
  losses: number;
  gf:     number;
  ga:     number;
  gd:     number;
  points: number;
};

// ── Standings calculation ─────────────────────────────────────────────────────

function computeGroupStandings(groupMatches: WC26Match[]): GroupTeamStats[] {
  const teams = new Map<string, GroupTeamStats>();

  for (const m of groupMatches) {
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (!teams.has(t.code)) {
        teams.set(t.code, {
          code: t.code, name: t.name,
          played: 0, wins: 0, draws: 0, losses: 0,
          gf: 0, ga: 0, gd: 0, points: 0,
        });
      }
    }
  }

  for (const m of groupMatches) {
    if (m.status !== 'finished') continue;
    if (m.homeScore === null || m.awayScore === null) continue;

    const home = teams.get(m.homeTeam.code)!;
    const away = teams.get(m.awayTeam.code)!;
    home.played++;  away.played++;
    home.gf += m.homeScore;  home.ga += m.awayScore;
    away.gf += m.awayScore;  away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.wins++;  home.points += 3;
      away.losses++;
    } else if (m.homeScore < m.awayScore) {
      away.wins++;  away.points += 3;
      home.losses++;
    } else {
      home.draws++;  home.points++;
      away.draws++;  away.points++;
    }
  }

  for (const t of teams.values()) t.gd = t.gf - t.ga;

  return Array.from(teams.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd     !== a.gd)     return b.gd     - a.gd;
    if (b.gf     !== a.gf)     return b.gf     - a.gf;
    return a.name.localeCompare(b.name);
  });
}

const formatGD = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function dotColor(rank: number): string {
  if (rank < 2) return colors.accent;
  if (rank === 2) return colors.amber;
  return colors.textMuted;
}

// ── CollapseChevron ───────────────────────────────────────────────────────────

function CollapseChevron({ expanded }: { expanded: boolean }) {
  return (
    <View style={{ transform: [{ rotate: expanded ? '0deg' : '-90deg' }] }}>
      <Svg width={13} height={13} viewBox="0 0 14 14">
        <Path
          d="M3 5 L7 9 L11 5"
          stroke={colors.textMuted}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

// ── GroupStandingsCard ────────────────────────────────────────────────────────

function GroupStandingsCard({ group, allMatches }: { group: typeof GROUPS[number]; allMatches: WC26Match[] }) {
  const [expanded, setExpanded] = useState(true);
  const matches = useMemo(
    () => allMatches.filter(m => m.stage === 'Group Stage' && m.group === group),
    [allMatches, group],
  );
  const standings = useMemo(() => computeGroupStandings(matches), [matches]);

  return (
    <View style={sc.card}>
      {/* Group header — tappable to collapse/expand */}
      <Pressable
        style={({ pressed }) => [sc.cardHead, pressed && sc.cardHeadPressed]}
        onPress={() => setExpanded(e => !e)}
        accessibilityRole="button"
        accessibilityLabel={`Group ${group} standings`}
        accessibilityState={{ expanded }}
      >
        <Text style={sc.groupLabel}>GROUP {group}</Text>
        {expanded && (
          <View style={sc.colHdrRow}>
            <Text style={sc.colHdr}>P</Text>
            <Text style={sc.colHdr}>W</Text>
            <Text style={sc.colHdr}>D</Text>
            <Text style={sc.colHdr}>L</Text>
            <Text style={[sc.colHdr, sc.gdW]}>GD</Text>
            <Text style={[sc.colHdr, sc.ptsW]}>Pts</Text>
          </View>
        )}
        <View style={sc.chevronWrap}>
          <CollapseChevron expanded={expanded} />
        </View>
      </Pressable>

      {expanded && (
        <>
          <View style={sc.headerDiv} />

          {standings.map((t, i) => (
        <React.Fragment key={t.code}>
          {i > 0 && <View style={sc.rowDiv} />}
          <View style={[sc.row, i < 2 && sc.rowAdvances, i === 2 && sc.rowWildcard]}>
            {/* Qualifier stripe */}
            {i < 2 && <View style={sc.stripeGreen} />}
            {i === 2 && <View style={sc.stripeAmber} />}

            {/* Status dot */}
            <View style={[sc.dot, { backgroundColor: dotColor(i) }]} />

            {/* Flag */}
            <TeamFlagImage flagUrl={getFlagUrl(t.code)} width={22} height={14} />

            {/* Name */}
            <Text style={sc.teamName} numberOfLines={1}>{t.name}</Text>

            {/* Stats */}
            <Text style={sc.stat}>{t.played}</Text>
            <Text style={sc.stat}>{t.wins}</Text>
            <Text style={sc.stat}>{t.draws}</Text>
            <Text style={sc.stat}>{t.losses}</Text>
            <Text style={[sc.stat, sc.gdW, t.gd > 0 && sc.gdPos, t.gd < 0 && sc.gdNeg]}>
              {formatGD(t.gd)}
            </Text>
            <Text style={[sc.stat, sc.ptsW, t.points > 0 && sc.ptsAccent]}>
              {t.points}
            </Text>
          </View>
        </React.Fragment>
          ))}
        </>
      )}
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  cardHeadPressed: {
    opacity: 0.7,
  },
  chevronWrap: {
    marginLeft: 6,
  },
  groupLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.barlowBold,
    color: colors.accent,
    letterSpacing: 1.8,
  },
  colHdrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  colHdr: {
    width: 22,
    fontSize: 13,
    fontFamily: fonts.barlowSemi,
    color: colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  gdW:   { width: 30 },
  ptsW:  { width: 28, fontWeight: '700' },
  headerDiv: {
    height: 1,
    backgroundColor: colors.divider,
  },
  rowDiv: {
    height: 1,
    backgroundColor: colors.divider,
    marginLeft: 40,  // indent under flag
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 6,
    minHeight: 40,
  },
  rowAdvances: { backgroundColor: '#F5FAF7' },
  rowWildcard: { backgroundColor: '#FFFBF0' },
  stripeGreen: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: colors.accent,
  },
  stripeAmber: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: colors.amber,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  teamName: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.interMedium,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  stat: {
    width: 22,
    fontSize: 12,
    fontFamily: fonts.interRegular,
    color: colors.textSecondary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  gdPos:    { color: colors.accent },
  gdNeg:    { color: '#B91C1C' },
  ptsAccent: { color: colors.accent, fontFamily: fonts.interSemi },
});

// ── StandingsView ─────────────────────────────────────────────────────────────

function StandingsView({ allMatches }: { allMatches: WC26Match[] }) {
  return (
    <ScrollView
      style={sv.scroll}
      contentContainerStyle={sv.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Legend — above groups */}
      <View style={sv.legend}>
        <View style={sv.qualRow}>
          <View style={sv.legendItem}>
            <View style={[sv.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={sv.legendText}>Top 2 qualify</Text>
          </View>
          <View style={sv.legendItem}>
            <View style={[sv.legendDot, { backgroundColor: colors.amber }]} />
            <Text style={sv.legendText}>Best 3rd</Text>
          </View>
          <View style={sv.legendItem}>
            <View style={[sv.legendDot, { backgroundColor: colors.textMuted }]} />
            <Text style={sv.legendText}>Outside top 3</Text>
          </View>
        </View>
        <Text style={sv.statLine}>P Played · W Wins · D Draws · L Losses · GD Goal diff · Pts Points</Text>
      </View>

      {GROUPS.map(g => (
        <GroupStandingsCard key={g} group={g} allMatches={allMatches} />
      ))}
    </ScrollView>
  );
}

const sv = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { paddingTop: 8, paddingBottom: 32 },
  legend: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 5,
  },
  qualRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 14,
    rowGap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontFamily: fonts.interRegular,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  statLine: {
    fontSize: 10,
    fontFamily: fonts.interRegular,
    color: colors.textMuted,
    letterSpacing: 0.2,
    lineHeight: 15,
  },
});

// ── Bracket geometry constants ────────────────────────────────────────────────

const UNIT      = 40;  // height of one R32 slot (px)
const MATCHUP_H = 34;  // rendered height of each matchup pill
const PILL_W    = 112; // matchup pill width
const LEFT_PAD  = 8;   // space left of pill inside column
const RIGHT_PAD = 8;   // space right of pill (first half of connector)
const COL_GAP   = 16;  // gap between columns (second half of connector)
const COL_W     = LEFT_PAD + PILL_W + RIGHT_PAD; // 128
const STEP      = COL_W + COL_GAP;               // 144
const HEADER_H  = 36;
const TOTAL_H   = 16 * UNIT + HEADER_H;          // 676
const TOTAL_W   = 4 * STEP + COL_W + 20;         // 724 (final col + right padding)
const LINE_CLR  = colors.cardBorder;

const ROUNDS = [
  { label: 'Round 32', count: 16 },
  { label: 'Round 16', count: 8  },
  { label: 'Quarterfinals',  count: 4  },
  { label: 'Semifinals',  count: 2  },
  { label: 'Finals',   count: 1  },
] as const;

// Vertical center of matchup i in round r (0-based)
function centerY(r: number, i: number): number {
  const slotH = UNIT * (1 << r); // UNIT * 2^r
  return HEADER_H + i * slotH + slotH / 2;
}

// ── BracketCanvas ─────────────────────────────────────────────────────────────

function BracketCanvas() {
  const nodes: React.ReactElement[] = [];

  ROUNDS.forEach((round, r) => {
    const colLeft   = r * STEP;
    const pillLeft  = colLeft + LEFT_PAD;
    const pillRight = pillLeft + PILL_W;
    // Elbow X = midpoint of the gap to the right of this column
    const elbowX    = colLeft + COL_W + COL_GAP / 2;

    // ── Column header label
    nodes.push(
      <View
        key={`hdr-${r}`}
        style={{
          position: 'absolute',
          left: colLeft,
          top: centerY(r, 0) - MATCHUP_H / 2 - HEADER_H,
          width: COL_W,
          height: HEADER_H,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 6,
        }}
      >
        <Text style={bs.colLabel}>{round.label}</Text>
      </View>,
    );

    for (let i = 0; i < round.count; i++) {
      const cy  = centerY(r, i);
      const top = cy - MATCHUP_H / 2;

      // ── Matchup pill (two team rows + 1px divider)
      nodes.push(
        <View
          key={`pill-${r}-${i}`}
          style={{
            position: 'absolute',
            left: pillLeft,
            top,
            width: PILL_W,
            height: MATCHUP_H,
            backgroundColor: colors.card,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            overflow: 'hidden',
          }}
        >
          <View style={bs.teamRow}>
            <Text style={bs.tbd}>TBD</Text>
          </View>
          <View style={bs.divider} />
          <View style={bs.teamRow}>
            <Text style={bs.tbd}>TBD</Text>
          </View>
        </View>,
      );

      // ── Horizontal exit line from pill right → elbow (skip last round)
      if (r < ROUNDS.length - 1) {
        nodes.push(
          <View
            key={`hout-${r}-${i}`}
            style={{
              position: 'absolute',
              left: pillRight,
              top: cy,
              width: elbowX - pillRight,
              height: 1,
              backgroundColor: LINE_CLR,
            }}
          />,
        );
      }
    }

    // ── Vertical elbow + horizontal entry line → next round (skip last round)
    if (r < ROUNDS.length - 1) {
      const pairs        = round.count / 2;
      const nextPillLeft = (r + 1) * STEP + LEFT_PAD;

      for (let k = 0; k < pairs; k++) {
        const topY = centerY(r, 2 * k);
        const botY = centerY(r, 2 * k + 1);
        const midY = (topY + botY) / 2;

        // Vertical line at elbow connecting top and bottom matchup centers
        nodes.push(
          <View
            key={`vert-${r}-${k}`}
            style={{
              position: 'absolute',
              left: elbowX,
              top: topY,
              width: 1,
              height: botY - topY,
              backgroundColor: LINE_CLR,
            }}
          />,
        );

        // Horizontal entry line from elbow midpoint → next round pill
        nodes.push(
          <View
            key={`hin-${r}-${k}`}
            style={{
              position: 'absolute',
              left: elbowX,
              top: midY,
              width: nextPillLeft - elbowX,
              height: 1,
              backgroundColor: LINE_CLR,
            }}
          />,
        );
      }
    }
  });

  return (
    <View style={{ width: TOTAL_W, height: TOTAL_H }}>
      {nodes}
    </View>
  );
}

// ── BracketCanvas styles ──────────────────────────────────────────────────────

const bs = StyleSheet.create({
  colLabel: {
    fontSize: 11,
    fontFamily: fonts.barlowBold,
    color: colors.accent,
    letterSpacing: 2,
  },
  teamRow: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tbd: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
  },
});

// ── TournamentScreen ──────────────────────────────────────────────────────────

export function TournamentScreen() {
  const [segment, setSegment] = useState<Segment>('standings');
  const { matches } = useMatchData();

  return (
    <View style={styles.root}>
      {/* ── Standings / Bracket toggle ─────────────────────────────────────── */}
      <View style={styles.toggleRow}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: segment === 'standings' }}
          style={[styles.pill, segment === 'standings' && styles.pillActive]}
          onPress={() => setSegment('standings')}
        >
          <Text style={[styles.pillText, segment === 'standings' && styles.pillTextActive]}>
            Standings
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: segment === 'bracket' }}
          style={[styles.pill, segment === 'bracket' && styles.pillActive]}
          onPress={() => setSegment('bracket')}
        >
          <Text style={[styles.pillText, segment === 'bracket' && styles.pillTextActive]}>
            Bracket
          </Text>
        </Pressable>
      </View>

      {/* ── Standings ─────────────────────────────────────────────────────── */}
      {segment === 'standings' && <StandingsView allMatches={matches} />}

      {/* ── Bracket ───────────────────────────────────────────────────────── */}
      {segment === 'bracket' && (
        // Vertical scroll: lets user scroll up/down through R32 matchups
        <ScrollView
          style={styles.outerScroll}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <Text style={styles.bracketNote}>
            Knockout bracket will populate after group stage results are finalized.
          </Text>

          {/* Horizontal scroll: lets user pan left/right through rounds */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ height: TOTAL_H }}
            contentContainerStyle={styles.bracketPadding}
            decelerationRate="normal"
          >
            <BracketCanvas />
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

// ── Screen styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Standings / Bracket toggle
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pill: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  pillActive: {
    backgroundColor: '#EDF1F6',
    borderColor: '#1F3B5D',
  },
  pillText: {
    fontSize: 15,
    fontFamily: fonts.barlowBold,
    color: '#9AA3AF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  pillTextActive: {
    color: '#1F3B5D',
  },

  // Bracket
  outerScroll: {
    flex: 1,
  },
  bracketNote: {
    fontSize: 12,
    fontFamily: fonts.interRegular,
    color: colors.textMuted,
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  bracketPadding: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
