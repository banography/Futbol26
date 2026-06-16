import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { PlayerJerseyAvatar } from './PlayerJerseyAvatar';
import type { Player, PositionCode } from '../src/data/worldCup2026Squads';
import { colors } from '../constants/colors';

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

const POSITION_LABEL: Record<PositionCode, string> = {
  FW: 'Forward',
  MF: 'Midfielder',
  DF: 'Defender',
  GK: 'Goalkeeper',
};

interface PlayerCardProps {
  player: Player;
  teamFlag: string;
  isLast?: boolean;
}

export const ProjectedPlayerCard = React.memo(function ProjectedPlayerCard({ player, teamFlag, isLast = false }: PlayerCardProps) {
  const router = useRouter();
  const [photoFailed, setPhotoFailed] = useState(false);
  const showSilhouette = !player.photoUrl || photoFailed;
  const teamCode = player.id.split('-')[0]?.toUpperCase() ?? '';

  function handlePress() {
    router.push({
      pathname: '/player/[playerId]',
      params: { playerId: player.id, flag: teamFlag },
    });
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={handlePress}
        accessibilityLabel={`View ${player.fullName} profile`}
        accessibilityRole="button"
      >
        {/* Left — photo or silhouette, bottom-aligned */}
        <View style={styles.photoContainer}>
          {showSilhouette ? (
            <PlayerJerseyAvatar teamCode={teamCode} jerseyNumber={player.jerseyNumber} width={52} height={58} />
          ) : (
            <Image
              source={{ uri: player.photoUrl }}
              style={styles.photo}
              resizeMode="contain"
              onError={() => setPhotoFailed(true)}
            />
          )}
        </View>

        {/* Right — name / number / position, vertically centered */}
        <View style={styles.textContainer}>
          <Text style={styles.name}>{player.fullName}</Text>
          <Text style={styles.number}>#{player.jerseyNumber}</Text>
          <Text style={styles.position}>{POSITION_LABEL[player.position]}</Text>
        </View>

        {/* Chevron — self-centered vertically regardless of row alignItems */}
        <View style={styles.chevron}>
          <IconChevronRight />
        </View>
      </Pressable>

      {!isLast && <View style={styles.separator} />}
    </>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  cardPressed: {
    backgroundColor: colors.divider,
  },
  photoContainer: {
    width: 56,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  photo: {
    width: 52,
    height: 72,
    // No border-radius, no background — transparent cutout style
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  number: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0,
    textAlign: 'left',
    lineHeight: 36,
  },
  position: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  chevron: {
    alignSelf: 'center',
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 16,
  },
});
