import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { PlayerSilhouette } from './PlayerSilhouette';
import type { Player, PositionCode } from '../src/data/worldCup2026Squads';
import { colors } from '../constants/colors';

const POSITION_LABEL: Record<PositionCode, string> = {
  GK: 'Goalkeeper',
  DF: 'Defender',
  MF: 'Midfielder',
  FW: 'Forward',
};

interface PlayerCardProps {
  player: Player;
}

export function ProjectedPlayerCard({ player }: PlayerCardProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showSilhouette = !player.photoUrl || photoFailed;

  return (
    <>
      <Pressable
        style={styles.card}
        // TODO: open player detail modal with full player info
        onPress={() => {
          console.log(`[Futbol26] Player tapped: ${player.fullName} #${player.jerseyNumber}`, player);
        }}
      >
        {/* Left — photo or silhouette, bottom-aligned */}
        <View style={styles.photoContainer}>
          {showSilhouette ? (
            <PlayerSilhouette width={52} height={72} />
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
      </Pressable>

      {/* Thin separator — rendered outside the Pressable so it spans full width */}
      <View style={styles.separator} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    // Transparent — no backgroundColor
  },
  photoContainer: {
    width: 56,
    height: 76,
    justifyContent: 'flex-end',
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
  separator: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 16,
  },
});
