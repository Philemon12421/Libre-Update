import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Logo from './components/Logo';

const { width, height } = Dimensions.get('window');

interface Props { onFinish: () => void; }

export default function SplashScreen({ onFinish }: Props) {
  const logoScale    = useRef(new Animated.Value(0.3)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textY        = useRef(new Animated.Value(20)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  // ring pulse
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse rings loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ring1, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(ring1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(ring2, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    pulse.start();
    pulse2.start();

    Animated.sequence([
      // 1. Logo springs in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      // 2. App name slides up
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
      // 3. Tagline fades in
      Animated.timing(tagOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // 4. Hold
      Animated.delay(1000),
      // 5. Fade out
      Animated.timing(screenOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => {
      pulse.stop();
      pulse2.stop();
      onFinish();
    });
  }, []);

  const ring1Scale  = ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const ring1Opacity = ring1.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 0.3, 0] });
  const ring2Scale  = ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.0] });
  const ring2Opacity = ring2.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 0.2, 0] });

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar style="dark" />

      {/* Background glow blobs */}
      <View style={styles.blobTL} />
      <View style={styles.blobBR} />
      <View style={styles.blobCenter} />

      {/* Grid dots */}
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 5 }).map((_, col) => (
          <View
            key={`${row}-${col}`}
            style={[styles.gridDot, {
              top: (height / 6) * row + height / 12,
              left: (width / 5) * col + width / 10,
            }]}
          />
        ))
      )}

      {/* Center */}
      <View style={styles.center}>
        {/* Pulse rings behind logo */}
        <Animated.View style={[styles.ring, {
          transform: [{ scale: ring1Scale }],
          opacity: ring1Opacity,
        }]} />
        <Animated.View style={[styles.ring, {
          transform: [{ scale: ring2Scale }],
          opacity: ring2Opacity,
        }]} />

        {/* Logo */}
        <Animated.View style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          zIndex: 2,
        }}>
          <Logo size={96} />
        </Animated.View>

        {/* App name */}
        <Animated.View style={{
          opacity: textOpacity,
          transform: [{ translateY: textY }],
          alignItems: 'center',
          marginTop: 28,
        }}>
          <Text style={styles.appName}>LIBRE</Text>
          <Text style={styles.appSub}>ARCHIVAL NODE</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: tagOpacity, alignItems: 'center', marginTop: 14 }}>
          <Text style={styles.tagline}>Your knowledge. Your device. Always.</Text>
        </Animated.View>
      </View>

      {/* Bottom version */}
      <Animated.View style={[styles.versionRow, { opacity: tagOpacity }]}>
        <View style={styles.versionDot} />
        <Text style={styles.versionText}>v1.0.0</Text>
        <View style={styles.versionDot} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Background elements
  blobTL: {
    position: 'absolute', top: -120, left: -120,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: '#2563eb', opacity: 0.05,
  },
  blobBR: {
    position: 'absolute', bottom: -100, right: -100,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#7c3aed', opacity: 0.05,
  },
  blobCenter: {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#1d4ed8', opacity: 0.03,
  },
  gridDot: {
    position: 'absolute',
    width: 2.5, height: 2.5, borderRadius: 1.25,
    backgroundColor: '#cbd5e1', opacity: 0.8,
  },

  // Pulse rings
  ring: {
    position: 'absolute',
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 1.5, borderColor: '#3b82f6',
    zIndex: 1,
  },

  center: { alignItems: 'center', zIndex: 2 },

  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 8,
  },
  appSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3b82f6',
    letterSpacing: 4,
    marginTop: 5,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: 0.3,
  },

  versionRow: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 52 : 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#2563eb', opacity: 0.6,
  },
  versionText: {
    fontSize: 10, fontWeight: '700',
    color: '#94a3b8', letterSpacing: 1.5,
  },
});
