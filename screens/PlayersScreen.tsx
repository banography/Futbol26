import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { SQUADS } from '../src/data/worldCup2026Squads';
import type { Squad, Player, PositionCode } from '../src/data/worldCup2026Squads';
import { ProjectedPlayerCard } from '../components/ProjectedPlayerCard';
import { PlayerJerseyAvatar } from '../components/PlayerJerseyAvatar';
import { TeamFlagImage } from '../components/TeamFlagImage';
import { getFlagUrl } from '../services/futbolApi';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';

// ── Flag map ──────────────────────────────────────────────────────────────────

const TEAM_FLAG: Record<string, string> = {
  ALG: '🇩🇿', ARG: '🇦🇷', AUS: '🇦🇺', AUT: '🇦🇹', BEL: '🇧🇪',
  BIH: '🇧🇦', BRA: '🇧🇷', CAN: '🇨🇦', CIV: '🇨🇮', COD: '🇨🇩',
  COL: '🇨🇴', CPV: '🇨🇻', CRO: '🇭🇷', CUW: '🇨🇼', CZE: '🇨🇿',
  ECU: '🇪🇨', EGY: '🇪🇬', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸', FRA: '🇫🇷',
  GER: '🇩🇪', GHA: '🇬🇭', HAI: '🇭🇹', IRN: '🇮🇷', IRQ: '🇮🇶',
  JOR: '🇯🇴', JPN: '🇯🇵', KOR: '🇰🇷', KSA: '🇸🇦', MAR: '🇲🇦',
  MEX: '🇲🇽', NED: '🇳🇱', NOR: '🇳🇴', NZL: '🇳🇿', PAN: '🇵🇦',
  PAR: '🇵🇾', POR: '🇵🇹', QAT: '🇶🇦', RSA: '🇿🇦', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  SEN: '🇸🇳', SUI: '🇨🇭', SWE: '🇸🇪', TUN: '🇹🇳', TUR: '🇹🇷',
  URU: '🇺🇾', USA: '🇺🇸', UZB: '🇺🇿',
};

// ── Position config ───────────────────────────────────────────────────────────

const POSITION_ORDER: PositionCode[] = ['GK', 'DF', 'MF', 'FW'];

const POSITION_LABELS: Record<PositionCode, string> = {
  GK: 'Goalkeepers',
  DF: 'Defenders',
  MF: 'Midfielders',
  FW: 'Forwards',
};

// ── Types ─────────────────────────────────────────────────────────────────────

type SearchPlayer = Player & { teamCode: string; teamName: string; searchKey: string };
type SearchableSquad = { squad: Squad; nameKey: string; codeKey: string };

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <Svg width={16} height={16} viewBox="0 0 16 16">
      <Circle cx="6.5" cy="6.5" r="4.5" stroke={colors.textMuted} strokeWidth="1.5" fill="none" />
      <Path d="M10 10 L14 14" stroke={colors.textMuted} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  );
}

function IconClear() {
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

function IconChevronRight() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path
        d="M5 3 L10 7 L5 11"
        stroke={colors.textMuted}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function IconChevronLeft() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Path
        d="M13 4 L7 10 L13 16"
        stroke={colors.accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    if (!value) { setDebounced(''); return; }
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── CountryRow ────────────────────────────────────────────────────────────────

const CountryRow = React.memo(function CountryRow({
  squad,
  onPress,
}: {
  squad: Squad;
  onPress: (code: string) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.countryRow, pressed && s.pressed]}
      onPress={() => onPress(squad.teamCode)}
      accessibilityLabel={`View ${squad.teamName} squad`}
      accessibilityRole="button"
    >
      <TeamFlagImage flagUrl={getFlagUrl(squad.teamCode)} width={36} height={22} />
      <Text style={s.countryName}>{squad.teamName}</Text>
      <IconChevronRight />
    </Pressable>
  );
});

// ── SearchPlayerRow ───────────────────────────────────────────────────────────

const SearchPlayerRow = React.memo(function SearchPlayerRow({
  player,
  onPress,
}: {
  player: SearchPlayer;
  onPress: (player: SearchPlayer) => void;
}) {
  const [photoFailed, setPhotoFailed] = React.useState(false);
  const showSilhouette = !player.photoUrl || photoFailed;

  return (
    <Pressable
      style={({ pressed }) => [s.searchRow, pressed && s.pressed]}
      onPress={() => onPress(player)}
      accessibilityLabel={`View ${player.fullName} profile`}
      accessibilityRole="button"
    >
      <View style={s.searchPhotoWrap}>
        {showSilhouette ? (
          <PlayerJerseyAvatar teamCode={player.teamCode} jerseyNumber={player.jerseyNumber} width={36} height={40} />
        ) : (
          <Image
            source={{ uri: player.photoUrl }}
            style={s.searchPhoto}
            resizeMode="contain"
            onError={() => setPhotoFailed(true)}
          />
        )}
      </View>
      <View style={s.searchTextWrap}>
        <Text style={s.searchName} numberOfLines={1}>
          {player.fullName}
        </Text>
        <View style={s.searchSubRow}>
          <TeamFlagImage flagUrl={getFlagUrl(player.teamCode)} width={22} height={14} />
          <Text style={s.searchSub} numberOfLines={1}>
            {player.teamName}{'  ·  '}#{player.jerseyNumber}{'  ·  '}{POSITION_LABELS[player.position]}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

// ── PositionSection ───────────────────────────────────────────────────────────

function PositionSection({
  position,
  players,
  teamFlag,
}: {
  position: PositionCode;
  players: Player[];
  teamFlag: string;
}) {
  if (players.length === 0) return null;
  return (
    <View style={s.positionSection}>
      <View style={s.positionHeaderRow}>
        <Text style={s.positionLabel}>{POSITION_LABELS[position].toUpperCase()}</Text>
        <View style={s.positionLine} />
      </View>
      <View style={s.positionCard}>
        {players.map((player) => (
          <ProjectedPlayerCard key={player.id} player={player} teamFlag={teamFlag} />
        ))}
      </View>
    </View>
  );
}

// ── PlayersScreen ─────────────────────────────────────────────────────────────

export function PlayersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // ── Static data (computed once)
  const sortedSquads = useMemo(
    () => Object.values(SQUADS).sort((a, b) => a.teamName.localeCompare(b.teamName)),
    [],
  );

  const allPlayers = useMemo<SearchPlayer[]>(
    () =>
      Object.values(SQUADS).flatMap((squad) =>
        squad.players.map((p) => ({
          ...p,
          teamCode: squad.teamCode,
          teamName: squad.teamName,
          searchKey: p.fullName.toLowerCase(),
        })),
      ),
    [],
  );

  const searchableSquads = useMemo<SearchableSquad[]>(
    () => sortedSquads.map((s) => ({
      squad: s,
      nameKey: s.teamName.toLowerCase(),
      codeKey: s.teamCode.toLowerCase(),
    })),
    [sortedSquads],
  );

  // ── Derived
  const trimmedSearch   = search.trim();
  const debouncedQuery  = useDebounce(trimmedSearch, 150);

  const searchCountries = useMemo<Squad[]>(() => {
    if (!debouncedQuery) return [];
    return searchableSquads
      .filter((ss) => ss.nameKey.startsWith(debouncedQuery) || ss.codeKey.startsWith(debouncedQuery))
      .map((ss) => ss.squad);
  }, [searchableSquads, debouncedQuery]);

  const searchPlayers = useMemo<SearchPlayer[]>(() => {
    if (!debouncedQuery) return [];
    return allPlayers.filter((p) => p.searchKey.includes(debouncedQuery));
  }, [allPlayers, debouncedQuery]);

  const selectedSquad = selectedCode ? (SQUADS[selectedCode] ?? null) : null;

  // ── Handlers
  const handleCountryPress = useCallback((code: string) => {
    setSearch('');
    setSelectedCode(code);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCode(null);
  }, []);

  const handlePlayerPress = useCallback(
    (player: SearchPlayer) => {
      router.push({
        pathname: '/player/[playerId]',
        params: { playerId: player.id, flag: TEAM_FLAG[player.teamCode] ?? '' },
      });
    },
    [router],
  );

  // ── View state: roster overrides everything when a country is selected
  const view = selectedCode ? 'roster' : debouncedQuery ? 'search' : 'countries';

  return (
    <View style={s.root}>
      {/* Search bar — hidden while browsing a roster */}
      {view !== 'roster' && (
        <View style={s.searchBarWrap}>
          <View style={s.searchBar}>
            <IconSearch />
            <TextInput
              style={s.searchInput}
              placeholder="Search players or countries"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="never"
              accessibilityLabel="Search players or countries"
              accessibilityHint="Type a player name or country to search all 48 squads"
            />
            {search.length > 0 && (
              <Pressable
                style={s.clearBtn}
                onPress={() => setSearch('')}
                hitSlop={8}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <IconClear />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Countries A–Z */}
      {view === 'countries' && (
        <FlatList
          data={sortedSquads}
          keyExtractor={(item) => item.teamCode}
          renderItem={({ item }) => (
            <CountryRow squad={item} onPress={handleCountryPress} />
          )}
          ListHeaderComponent={
            <View style={s.listHeader}>
              <Text style={s.listHeaderText}>
                {sortedSquads.length} NATIONS
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={s.rowSeparator} />}
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Search results */}
      {view === 'search' && (
        <ScrollView
          contentContainerStyle={s.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {searchCountries.length === 0 && searchPlayers.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={s.emptyTitle}>No results for "{debouncedQuery}"</Text>
              <Text style={s.emptyHint}>Try a different spelling</Text>
            </View>
          ) : (
            <>
              {searchCountries.length > 0 && (
                <>
                  <View style={s.searchSectionHeader}>
                    <Text style={s.searchSectionLabel}>COUNTRIES</Text>
                    <View style={s.searchSectionLine} />
                  </View>
                  {searchCountries.map((squad, i) => (
                    <React.Fragment key={squad.teamCode}>
                      <CountryRow squad={squad} onPress={handleCountryPress} />
                      {i < searchCountries.length - 1 && <View style={s.rowSeparator} />}
                    </React.Fragment>
                  ))}
                </>
              )}
              {searchPlayers.length > 0 && (
                <>
                  <View style={s.searchSectionHeader}>
                    <Text style={s.searchSectionLabel}>PLAYERS</Text>
                    <View style={s.searchSectionLine} />
                  </View>
                  {searchPlayers.map((player, i) => (
                    <React.Fragment key={player.id}>
                      <SearchPlayerRow player={player} onPress={handlePlayerPress} />
                      {i < searchPlayers.length - 1 && <View style={s.rowSeparator} />}
                    </React.Fragment>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Country roster */}
      {view === 'roster' && selectedSquad && (
        <ScrollView
          style={s.rosterScroll}
          contentContainerStyle={s.rosterContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <Pressable
            style={({ pressed }) => [s.backBtn, pressed && s.pressed]}
            onPress={handleBack}
            accessibilityLabel="Back to all nations"
            accessibilityRole="button"
          >
            <IconChevronLeft />
            <Text style={s.backText}>All Nations</Text>
          </Pressable>

          {/* Country header */}
<View style={s.rosterHeader}>
  <TeamFlagImage flagUrl={getFlagUrl(selectedSquad.teamCode)} width={130} height={80} />
  <Text style={s.rosterTeamName}>{selectedSquad.teamName}</Text>
</View>

{/* Head coach */}
{selectedSquad.headCoach ? (
  <View style={s.positionSection}>
    <View style={s.positionHeaderRow}>
      <Text style={s.positionLabel}>HEAD COACH</Text>
      <View style={s.positionLine} />
    </View>

    <View style={s.coachCard}>
      <Text style={s.coachName}>{selectedSquad.headCoach}</Text>
      {selectedSquad.headCoachNationality ? (
        <Text style={s.coachMeta}>
          Nationality: {selectedSquad.headCoachNationality}
        </Text>
      ) : null}
    </View>
  </View>
) : null}
          {/* Players by position */}
          {POSITION_ORDER.map((pos) => {
            const grouped = selectedSquad.players
              .filter((p) => p.position === pos)
              .sort((a, b) => a.jerseyNumber - b.jerseyNumber);
            return (
              <PositionSection
                key={pos}
                position={pos}
                players={grouped}
                teamFlag={TEAM_FLAG[selectedSquad.teamCode] ?? ''}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Search bar
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.interRegular,
    color: colors.textPrimary,
    height: 44,
  },
  clearBtn: {
    padding: 4,
  },

  // Shared list
  listContent: {
    paddingBottom: 48,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  listHeaderText: {
    fontSize: 11,
    fontFamily: fonts.barlowBold,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  rowSeparator: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 16,
  },

  // Country row
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
    minHeight: 56,
    gap: 12,
  },
  pressed: {
    opacity: 0.65,
  },
  countryFlag: {
    fontSize: 22,
    width: 30,
    textAlign: 'center',
  },
  countryName: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.barlowBold,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  // Search section headers
  searchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  searchSectionLabel: {
    fontSize: 10,
    fontFamily: fonts.barlowBold,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  searchSectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },

  // Search player row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    minHeight: 64,
    gap: 12,
  },
  searchPhotoWrap: {
    width: 44,
    height: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  searchPhoto: {
    width: 36,
    height: 50,
  },
  searchTextWrap: {
    flex: 1,
    gap: 4,
  },
  searchName: {
    fontSize: 14,
    fontFamily: fonts.barlowSemi,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  searchSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchSub: {
    fontSize: 11,
    fontFamily: fonts.interMedium,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    flexShrink: 1,
  },

  // Empty state
  emptyState: {
    paddingTop: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: fonts.interRegular,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: fonts.interRegular,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Roster
  rosterScroll: {
    flex: 1,
  },
  rosterContent: {
    paddingBottom: 48,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 4,
    minHeight: 44,
  },
  backText: {
    fontSize: 15,
    fontFamily: fonts.barlowSemi,
    color: colors.accent,
    letterSpacing: 0.2,
  },
  rosterHeader: {
  paddingHorizontal: 20,
  paddingTop: 12,
  paddingBottom: 30,
  alignItems: 'center',
  justifyContent: 'center',
},
  rosterFlagText: {
    fontSize: 40,
    marginBottom: 10,
  },
  rosterTeamName: {
  fontSize: 28,
  fontFamily: fonts.barlowBold,
  color: colors.textPrimary,
  letterSpacing: 0.3,
  marginTop: 12,
  marginBottom: 0,
  textAlign: 'center',
},
  // rosterCoach: {
  //   fontSize: 13,
  //   color: colors.textSecondary,
  //   letterSpacing: 0.3,
  // },

  // Position section
  positionSection: {
    marginBottom: 12,
  },
  positionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 12,
  },
  positionLabel: {
    fontSize: 10,
    fontFamily: fonts.barlowBold,
    color: colors.accent,
    letterSpacing: 2,
  },
  positionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  positionCard: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
    coachCard: {
  backgroundColor: colors.card,
  borderTopWidth: 1,
  borderBottomWidth: 1,
  borderColor: colors.cardBorder,
  paddingHorizontal: 16,
  paddingVertical: 14,
},

coachName: {
  fontSize: 15,
  fontFamily: fonts.barlowSemi,
  color: colors.textPrimary,
  letterSpacing: 0.2,
},

coachMeta: {
  fontSize: 12,
  fontFamily: fonts.interMedium,
  color: colors.textSecondary,
  letterSpacing: 0.3,
  marginTop: 3,
},
  },
);
