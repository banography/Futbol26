import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  BarlowCondensed_400Regular,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { LaunchIntro } from '../components/LaunchIntro';
import { MatchDataProvider } from '../contexts/MatchDataContext';

SplashScreen.preventAutoHideAsync();

// Module-level flag: true after the first cold launch completes the intro.
// Survives re-renders; resets only on a true cold restart of the JS engine.
let _introShown = false;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_400Regular,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [introVisible, setIntroVisible] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      if (!_introShown) {
        _introShown = true;
        setIntroVisible(true);
      }
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <MatchDataProvider>
        {/* Light status bar during intro (black bg); dark thereafter (light app bg) */}
        <StatusBar style={introVisible ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, gestureEnabled: true }} />
        {introVisible && (
          <LaunchIntro onDone={() => setIntroVisible(false)} />
        )}
      </MatchDataProvider>
    </SafeAreaProvider>
  );
}
