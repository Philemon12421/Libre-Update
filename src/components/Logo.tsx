import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { BookOpen } from 'lucide-react-native';

interface LogoProps {
  size?: number;
}

export default function Logo({ size = 36 }: LogoProps) {
  const innerSize = size * 0.9;
  const iconSize = size * 0.55;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size * 0.35 }]}>
      {/* Glossy overlay layer */}
      <View style={[styles.innerBox, { width: innerSize, height: innerSize, borderRadius: innerSize * 0.32 }]}>
        {/* Glow node */}
        <View style={styles.glowNode} />
        {/* Main Icon */}
        <BookOpen size={iconSize} color="#38bdf8" strokeWidth={2.5} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    // iOS shadow
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    // Android elevation
    elevation: 4,
  },
  innerBox: {
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  glowNode: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#7c3aed',
    opacity: 0.4,
  },
});
