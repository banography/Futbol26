import { View, Image, StyleSheet } from 'react-native';
import { ColorRibbon } from './ColorRibbon';
import { colors } from '../constants/colors';

export function AppHeader() {
  return (
    <View style={styles.container}>
      <ColorRibbon />
      <View style={styles.headerRow}>
        <Image
          source={require('../assets/futbol26_logo_dark.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.headerBg,
  },
  headerRow: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
  },
  headerLogo: {
    width: 200,
    height: 40,
    alignSelf: 'center',
  },
});
