import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

// ── Types ─────────────────────────────────────────────────────────────────────

type Segment = 'standings' | 'bracket';

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
    fontSize: 9,
    fontWeight: '800',
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

      {/* ── Standings placeholder ─────────────────────────────────────────── */}
      {segment === 'standings' && (
        <View style={styles.centerBox}>
          <Text style={styles.placeholderText}>Group standings coming soon</Text>
        </View>
      )}

      {/* ── Bracket ───────────────────────────────────────────────────────── */}
      {segment === 'bracket' && (
        // Vertical scroll: lets user scroll up/down through R32 matchups
        <ScrollView
          style={styles.outerScroll}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <Text style={styles.bracketNote}>
            Knockout bracket updates as groups finish.
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  pillActive: {
    backgroundColor: colors.groupPillBg,
    borderColor: colors.accent,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tabInactiveText,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  pillTextActive: {
    color: colors.accent,
  },

  // Standings
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  placeholderText: {
    fontSize: 15,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Bracket
  outerScroll: {
    flex: 1,
  },
  bracketNote: {
    fontSize: 10,
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
