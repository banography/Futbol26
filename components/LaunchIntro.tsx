import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet } from 'react-native';
import { PALETTE } from '../constants/colors';

// ── Geometry ──────────────────────────────────────────────────────────────────
// Matches the HTML prototype: each block is a rounded rect centered at the
// screen origin, sized proportionally to the screen diagonal, rotated by its
// position in the palette.

const { width: W, height: H } = Dimensions.get('window');
const DIAGONAL = Math.sqrt(W * W + H * H);
const TOTAL_ROT = 480; // 1.33 rotations; combined with longer duration = ~57% slower angular speed

type BlockSpec = {
  color: string;
  w: number;
  h: number;
  r: number;
  top: number;
  left: number;
  base: number; // base rotation offset in degrees
};

// Computed once at module load — safe since window dimensions don't change
// during a session.
const BLOCKS: BlockSpec[] = PALETTE.map((color, i) => {
  const t    = i / PALETTE.length;
  const size = DIAGONAL * (1 - t * 0.72); // largest block → smallest
  const w    = size * 0.52;
  const h    = size * 0.72;
  const r    = Math.min(w, h) * 0.28;
  return {
    color,
    w, h, r,
    top:  (H - h) / 2,
    left: (W - w) / 2,
    base: (i / PALETTE.length) * 360,
  };
});

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onDone: () => void;
}

export function LaunchIntro({ onDone }: Props) {
  const onDoneRef   = useRef(onDone);
  onDoneRef.current = onDone;

  const rotation     = useRef(new Animated.Value(0)).current;
  const swirlScale   = useRef(new Animated.Value(0)).current;
  const swirlOpacity = useRef(new Animated.Value(1)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const bgOpacity    = useRef(new Animated.Value(1)).current;

  // One interpolated rotate string per block, stable across renders.
  const blockRotations = useMemo(
    () => BLOCKS.map(b =>
      rotation.interpolate({
        inputRange:  [0,           TOTAL_ROT],
        outputRange: [`${b.base}deg`, `${b.base + TOTAL_ROT}deg`],
      }),
    ),
    [], // rotation ref is stable; deps intentionally empty
  );

  useEffect(() => {
    Animated.sequence([
      // Phase 1 — swirl spins in (2000 ms; 480° at 240°/s = 57% slower than before)
      Animated.parallel([
        Animated.timing(rotation, {
          toValue:  TOTAL_ROT,
          duration: 2000,
          easing:   Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(swirlScale, {
          toValue:  1,
          duration: 2000,
          easing:   Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Phase 2 — cross-dissolve: swirl fades out, logo fades in (350 ms)
      Animated.parallel([
        Animated.timing(swirlOpacity, {
          toValue:  0,
          duration: 350,
          easing:   Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue:  1,
          duration: 350,
          easing:   Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      // Phase 3 — hold on clean white logo (1200 ms)
      Animated.delay(1200),
      // Phase 4 — fade to app (350 ms)
      Animated.timing(bgOpacity, {
        toValue:  0,
        duration: 350,
        easing:   Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onDoneRef.current());
  }, []); // run once on mount

  return (
    <Animated.View style={[ss.container, { opacity: bgOpacity }]} pointerEvents="none">

      {/* 10-color swirl blocks */}
      <Animated.View style={[ss.fill, { opacity: swirlOpacity }]}>
        {BLOCKS.map((block, i) => (
          <Animated.View
            key={i}
            style={{
              position:        'absolute',
              width:           block.w,
              height:          block.h,
              top:             block.top,
              left:            block.left,
              borderRadius:    block.r,
              backgroundColor: block.color,
              transform: [
                { rotate: blockRotations[i]! },
                { scale:  swirlScale },
              ],
            }}
          />
        ))}
      </Animated.View>

      {/* Logo — cross-dissolves in as swirl fades out */}
      <Animated.View style={[ss.logoWrap, { opacity: logoOpacity }]}>
        <Image
          source={require('../assets/futbol26_logo.png')}
          style={ss.logo}
          resizeMode="contain"
        />
      </Animated.View>

    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000',
    overflow: 'hidden',
    zIndex: 9999,
  },
  fill: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  logoWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems:     'center',
    justifyContent: 'center',
  },
  logo: {
    width:  260,
    height: 64,
  },
});
