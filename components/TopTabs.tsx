import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors } from '../constants/colors';

export type TabId = 'matches' | 'tournament' | 'players' | 'my-bracket';

const TABS: { id: TabId; label: string }[] = [
  { id: 'matches',    label: 'Matches' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'players',    label: 'Players' },
  { id: 'my-bracket', label: 'My Bracket' },
];

interface TopTabsProps {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
}

export function TopTabs({ activeTab, onTabPress }: TopTabsProps) {
  return (
    <View style={styles.container}>
      {TABS.map(({ id, label }) => {
        const isActive = activeTab === id;
        return (
          <Pressable key={id} style={styles.tab} onPress={() => onTabPress(id)}>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {label}
            </Text>
            {isActive && <View style={styles.indicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tabInactiveText,
    letterSpacing: 0.5,
  },
  labelActive: {
    color: colors.tabActiveText,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: colors.tabActiveLine,
    borderRadius: 1,
  },
});
