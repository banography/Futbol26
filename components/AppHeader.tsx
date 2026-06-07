import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { ColorRibbon } from './ColorRibbon';
import { colors } from '../constants/colors';


interface AppHeaderProps {
  onHelpPress?: () => void;
  onProfilePress?: () => void;
}

export function AppHeader({ onHelpPress, onProfilePress }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <ColorRibbon />
      <View style={styles.headerRow}>
        <Pressable style={styles.circleBtn} onPress={onHelpPress}>
          <Text style={styles.circleBtnText}>?</Text>
        </Pressable>

        <Image
          source={require('../assets/futbol26_logo.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />

        <Pressable style={styles.circleBtn} onPress={onProfilePress}>
          <Text style={styles.circleBtnText}>👤</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.headerBg,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
  },
  circleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  headerLogo: {
  width: 200,
  height: 40,
  alignSelf: "center",
},
});
