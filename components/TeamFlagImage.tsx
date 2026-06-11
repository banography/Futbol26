import { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';

interface TeamFlagImageProps {
  flagUrl: string | null;
  /** Width in logical pixels. Default 64 (card size). */
  width?: number;
  /** Height in logical pixels. Default 40 (card size). */
  height?: number;
}

/**
 * Renders a rectangular flag image from a URL, or a styled "?" placeholder
 * if the URL is null. Used by both MatchCard (cards) and TeamFlagColumn
 * (match detail) so the flag presentation is identical everywhere.
 */
export function TeamFlagImage({ flagUrl, width = 64, height = 40 }: TeamFlagImageProps) {
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    setLoadError(false);
  }, [flagUrl]);

  const box = { width, height };

  if (flagUrl !== null && !loadError) {
    return (
      <Image
        source={{ uri: flagUrl }}
        style={[styles.flag, box]}
        resizeMode="cover"
        onError={() => setLoadError(true)}
      />
    );
  }

  return (
    <View style={[styles.placeholder, box]}>
      <Text style={styles.placeholderText}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flag: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  placeholder: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.groupPillBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textMuted,
    fontFamily: fonts.interSemi,
  },
});
