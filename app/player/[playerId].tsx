import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  Path,
} from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PlayerJerseyAvatar } from '../../components/PlayerJerseyAvatar';
import { TeamFlagImage } from '../../components/TeamFlagImage';
import { getFlagUrl } from '../../services/futbolApi';
import { getSquad } from '../../src/data/worldCup2026Squads';
import { getTeamColors } from '../../src/data/teamColors';
import type { PositionCode, Player } from '../../src/data/worldCup2026Squads';
import { getWikipediaEntry } from '../../src/data/generated/playerWikipedia.generated';
import { fonts } from '../../constants/typography';

// ── Light palette — matches the app's light FUTBOL26 theme ───────────────────
const L = {
  background:    '#F9F7F5',   // warm off-white
  heroBg:        '#E8F1EB',   // soft sage tint for the hero area
  card:          '#FFFFFF',
  cardBorder:    '#E6E1DB',   // warm stone border
  divider:       '#EDE9E4',
  accent:        '#2D6A49',   // deep forest green
  accentLight:   '#1C7E60',   // slightly brighter green for gradient interest
  textPrimary:   '#171412',   // warm near-black
  textSecondary: '#5A6474',   // muted slate
  textMuted:     '#9BA4AF',
};


// ── Constants ─────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const HEADER_H = 340;

const POSITION_LABEL: Record<PositionCode, string> = {
  FW: 'Forward',
  MF: 'Midfielder',
  DF: 'Defender',
  GK: 'Goalkeeper',
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CLUB_COUNTRY_LABEL: Record<string, string> = {
  ENG: 'England',      ESP: 'Spain',           FRA: 'France',
  GER: 'Germany',      ITA: 'Italy',           USA: 'the USA',
  POR: 'Portugal',     NED: 'the Netherlands', BRA: 'Brazil',
  ARG: 'Argentina',    MEX: 'Mexico',          KSA: 'Saudi Arabia',
  TUR: 'Turkey',       BEL: 'Belgium',         SCO: 'Scotland',
  AUT: 'Austria',      GRE: 'Greece',          SUI: 'Switzerland',
  SWE: 'Sweden',       DEN: 'Denmark',         NOR: 'Norway',
  HUN: 'Hungary',      CZE: 'Czechia',         CRO: 'Croatia',
  SRB: 'Serbia',       POL: 'Poland',          ROU: 'Romania',
  JPN: 'Japan',        KOR: 'South Korea',     AUS: 'Australia',
  QAT: 'Qatar',        CHN: 'China',           IRN: 'Iran',
  MAR: 'Morocco',      EGY: 'Egypt',           NGA: 'Nigeria',
  SEN: 'Senegal',      CIV: 'Ivory Coast',     CMR: 'Cameroon',
  GHA: 'Ghana',        TUN: 'Tunisia',         COL: 'Colombia',
  URU: 'Uruguay',      CHI: 'Chile',           PER: 'Peru',
  ECU: 'Ecuador',      PAR: 'Paraguay',        CAN: 'Canada',
  SAU: 'Saudi Arabia', UAE: 'UAE',             UKR: 'Ukraine',
  RUS: 'Russia',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolvePlayer(playerId: string) {
  const dash = playerId.indexOf('-');
  if (dash === -1) return null;
  const teamCode = playerId.slice(0, dash).toUpperCase();
  const jerseyNum = parseInt(playerId.slice(dash + 1), 10);
  if (isNaN(jerseyNum)) return null;
  const squad = getSquad(teamCode);
  if (!squad) return null;
  const player = squad.players.find((p) => p.jerseyNumber === jerseyNum) ?? null;
  return player ? { player, teamName: squad.teamName, teamCode } : null;
}

function formatDOB(dob: string): string {
  const [y, m, d] = dob.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function calcAge(dob: string): number {
  const [y, m, d] = dob.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

function stripCountry(club: string): string {
  return club.replace(/\s*\([^)]+\)\s*$/, '').trim();
}

function extractClubCountry(club: string): string | null {
  const m = club.match(/\(([A-Z]+)\)$/);
  return m ? (CLUB_COUNTRY_LABEL[m[1]] ?? null) : null;
}

// function generateSummary(
//   fullName: string,
//   jerseyNumber: number,
//   teamName: string,
//   club: string,
//   position: PositionCode,
// ): string {
//   const cleanClub = stripCountry(club);
//   const clubCountry = extractClubCountry(club);
//   const pos = POSITION_LABEL[position].toLowerCase();
//   const part1 = `${fullName} wears #${jerseyNumber} for ${teamName} at the 2026 World Cup.`;
//   const part2 = clubCountry
//     ? `A ${pos} by trade, he plays club football in ${clubCountry} for ${cleanClub}.`
//     : `A ${pos} by trade, he represents ${cleanClub} at club level.`;
//   return `${part1} ${part2}`;
// }

function getInstagramUrl(_player: Player): string | null {
  return null;
}

// ── Soft sage hero background ─────────────────────────────────────────────────
// Light, tinted hero that feels premium — uses the app's forest green palette
// at very low opacity over a warm sage base, with a bottom fade to the
// off-white scroll area so the transition is seamless.

function LightHeroBg({ teamColor }: { teamColor: string }) {
  return (
    <Svg width={SCREEN_W} height={HEADER_H} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="h0" cx="15%" cy="5%" r="55%">
          <Stop offset="0%" stopColor={teamColor} stopOpacity="0.20" />
          <Stop offset="100%" stopColor={teamColor} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="h1" cx="88%" cy="20%" r="50%">
          <Stop offset="0%" stopColor={teamColor} stopOpacity="0.13" />
          <Stop offset="100%" stopColor={teamColor} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="h2" cx="50%" cy="60%" r="45%">
          <Stop offset="0%" stopColor="#5B45C0" stopOpacity="0.05" />
          <Stop offset="100%" stopColor="#5B45C0" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="hFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="55%" stopColor={teamColor} stopOpacity="0" />
          <Stop offset="100%" stopColor={L.background} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      {/* Base: off-white + faint team color wash */}
      <Rect width={SCREEN_W} height={HEADER_H} fill={L.background} />
      <Rect width={SCREEN_W} height={HEADER_H} fill={teamColor} fillOpacity={0.08} />
      <Rect width={SCREEN_W} height={HEADER_H} fill="url(#h0)" />
      <Rect width={SCREEN_W} height={HEADER_H} fill="url(#h1)" />
      <Rect width={SCREEN_W} height={HEADER_H} fill="url(#h2)" />
      <Rect width={SCREEN_W} height={HEADER_H} fill="url(#hFade)" />
    </Svg>
  );
}

// ── Icons (forest green on light background) ──────────────────────────────────

function IgIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="2" width="20" height="20" rx="6" stroke={L.textSecondary} strokeWidth="2" />
      <Circle cx="12" cy="12" r="4" stroke={L.accent} strokeWidth="2" />
      <Circle cx="17.5" cy="6.5" r="1.5" fill={L.accent} />
    </Svg>
  );
}

function WikiIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={L.accent} strokeWidth="2" />
      <Path
        d="M6 8L9 15.5L12 10L15 15.5L18 8"
        stroke={L.accent}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
//cm to feet
function formatHeight(heightCm: number): string {
  const totalInches = Math.round(heightCm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  return `${feet}'${inches}" · ${heightCm} cm`;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function PlayerDetailScreen() {
  const router = useRouter();
  const { playerId } = useLocalSearchParams<{ playerId: string }>();

  const resolved = playerId ? resolvePlayer(playerId) : null;

  if (!resolved) {
    return (
      <SafeAreaView style={ss.safe}>
        <Pressable
          style={ss.backBtnAlt}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text style={ss.backArrow}>←</Text>
        </Pressable>
        <View style={ss.centerBox}>
          <Text style={ss.mutedText}>Player not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { player, teamName, teamCode } = resolved;
  const { primary: teamColor } = getTeamColors(teamCode);

  const nameParts = player.fullName.split(' ');
  const firstName = nameParts[0].toUpperCase();
  const lastName = nameParts.slice(1).join(' ').toUpperCase();

  const clubCountry = extractClubCountry(player.club);

const details: { label: string; value: string }[] = [
  { label: 'Squad Number',  value: `#${player.jerseyNumber}` },
  { label: 'Position',      value: POSITION_LABEL[player.position] },
  { label: 'Nation',        value: teamName },
  { label: 'Date of Birth', value: formatDOB(player.dateOfBirth) },
  { label: 'Age',           value: String(calcAge(player.dateOfBirth)) },
  { label: 'Height',        value: formatHeight(player.heightCm) },
  { label: 'Current Club',  value: stripCountry(player.club) },
  ...(clubCountry ? [{ label: 'Club Country', value: clubCountry }] : []),
];

  // const summary = generateSummary(
  //   player.fullName, player.jerseyNumber, teamName, player.club, player.position,
  // );

  const igUrl = getInstagramUrl(player);
  const wikiEntry = getWikipediaEntry(teamCode, player.jerseyNumber);
  const verifiedWikiUrl = wikiEntry?.wikipediaStatus === 'verified' ? (wikiEntry.wikipediaUrl ?? null) : null;
  const searchQuery = `${player.fullName} footballer ${teamName}`;
  const wikiSearchUrl = `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(searchQuery)}`;
  const wikiUrl = verifiedWikiUrl ?? wikiSearchUrl;
  const wikiLabel = verifiedWikiUrl ? 'Wikipedia' : 'Search Wiki';

  return (
    <SafeAreaView style={ss.safe}>
      <View style={ss.root}>

        {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
        <View style={ss.header}>
          <LightHeroBg teamColor={teamColor} />

          <Pressable
            style={ss.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={ss.backArrow}>←</Text>
          </Pressable>

          <View style={ss.heroContent}>
  {/* Jersey avatar — large, centered */}
  <PlayerJerseyAvatar
    teamCode={teamCode}
    jerseyNumber={player.jerseyNumber}
    width={120}
    height={135}
  />

  {/* Player name */}
  <View style={ss.nameBox}>
    <Text
      style={ss.firstName}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {firstName}
    </Text>

    {lastName ? (
      <Text
        style={ss.lastName}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {lastName}
      </Text>
    ) : null}
  </View>

  {/* Flag + team name */}
  <View style={ss.heroTeamBox}>
    <TeamFlagImage flagUrl={getFlagUrl(teamCode)} width={46} height={32} />
    <Text style={ss.heroTeamLabel}>{teamName}</Text>
  </View>
</View>
</View>
        {/* ── DETAIL CONTENT ──────────────────────────────────────────────── */}
        <View style={ss.body}>
          {/* Detail rows card */}
          <View style={ss.card}>
            {details.map(({ label, value }, idx) => (
              <View key={label}>
                <View style={ss.detailRow}>
                  <Text style={ss.detailLabel}>{label}</Text>
                  <Text style={ss.detailValue} numberOfLines={1}>{value}</Text>
                </View>
                {idx < details.length - 1 && <View style={ss.rowDivider} />}
              </View>
            ))}
          </View>

          {/* Summary card
          <View style={ss.card}>
            <Text style={ss.bioText}>{summary}</Text>
          </View> */}

          {/* Social links — wiki always shown; Instagram only when verified */}
          <View style={ss.linksSection}>
            {igUrl && (
              <Pressable
                style={({ pressed }) => [ss.footerBtn, pressed && ss.footerBtnPressed]}
                onPress={() => Linking.openURL(igUrl)}
                accessibilityLabel={`Open ${player.fullName} Instagram profile`}
                accessibilityRole="button"
              >
                <IgIcon />
                <Text style={ss.footerBtnLabel}>Instagram</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [ss.footerBtn, pressed && ss.footerBtnPressed]}
              onPress={() => Linking.openURL(wikiUrl)}
              accessibilityLabel={verifiedWikiUrl
                ? `Open ${player.fullName} Wikipedia page`
                : `Search Wikipedia for ${player.fullName}`}
              accessibilityRole="button"
            >
              <WikiIcon />
              <Text style={ss.footerBtnLabel}>{wikiLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: L.heroBg,   // status bar area matches the hero tint
  },
  root: {
    flex: 1,
    backgroundColor: L.background,
  },

  // ── Hero header
  header: {
    height: HEADER_H,
    overflow: 'hidden',
    backgroundColor: L.heroBg,   // fallback if SVG hasn't mounted
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: L.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  backArrow: {
    fontSize: 18,
    color: L.textPrimary,
    lineHeight: 20,
  },
  heroContent: {
  flex: 1,
  justifyContent: 'flex-start',
  alignItems: 'center',
  paddingTop: 36,
  paddingBottom: 12,
  gap: 12,
},
  nameBox: {
  alignItems: 'center',
  paddingHorizontal: 24,
  marginTop: 2,
},
  firstName: {
    fontSize: 36,
    fontFamily: fonts.barlowBold,
    color: L.textPrimary,
    letterSpacing: 3,
    textAlign: 'center',
    lineHeight: 40,
  },
  lastName: {
    fontSize: 36,
    fontFamily: fonts.barlowBold,
    color: L.textPrimary,
    letterSpacing: 3,
    textAlign: 'center',
    lineHeight: 40,
  },
  heroTeamBox: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginTop: 2,
  paddingBottom: 4,
},
  heroTeamLabel: {
  fontSize: 18,
  fontFamily: fonts.barlowSemi,
  color: L.textPrimary,
  letterSpacing: 0.2,
},

  // ── Detail body — fixed, no scroll
body: {
  flex: 1,
  paddingHorizontal: 16,
  paddingTop: 10,
  paddingBottom: 14,
  justifyContent: 'flex-start',
  gap: 18,
},
  linksSection: {
    flexDirection: 'row',
    gap: 12,
  },
  // Team full name — bridges the hero and cards
  teamFullName: {
    fontSize: 13,
    fontFamily: fonts.barlowBold,
    color: L.textMuted,
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // ── Detail card
  card: {
    backgroundColor: L.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: L.cardBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: fonts.barlowSemi,
    color: L.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: fonts.interSemi,
    color: L.textPrimary,
    letterSpacing: 0.2,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  rowDivider: {
    height: 1,
    backgroundColor: L.divider,
    marginHorizontal: 16,
  },

  // ── Section header (Quick Summary label + line)
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: fonts.barlowBold,
    color: L.accent,
    letterSpacing: 2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: L.divider,
  },

  // ── Quick Summary text
  bioText: {
    fontSize: 14,
    fontFamily: fonts.interRegular,
    color: L.textPrimary,
    letterSpacing: 0.2,
    lineHeight: 22,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  // ── Footer link buttons (Wikipedia / Instagram)
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: L.card,
    borderWidth: 1,
    borderColor: L.cardBorder,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  footerBtnPressed: {
    opacity: 0.7,
  },
  footerBtnLabel: {
    fontSize: 14,
    fontFamily: fonts.barlowSemi,
    color: L.textSecondary,
    letterSpacing: 0.3,
  },

  // ── Error state
  backBtnAlt: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: L.card,
    borderWidth: 1,
    borderColor: L.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  mutedText: {
    fontSize: 15,
    fontFamily: fonts.interRegular,
    color: L.textMuted,
    letterSpacing: 0.3,
  },
});
