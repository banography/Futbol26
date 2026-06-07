import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PALETTE } from '../constants/colors';

export function ColorRibbon() {
  return (
    <View style={styles.row}>
      {PALETTE.map((color, i) => (
        <View key={i} style={[styles.block, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    height: 5,
  },
  block: {
    flex: 1,
  },
});
