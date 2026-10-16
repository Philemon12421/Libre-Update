import React, { useRef } from 'react';
import {
  Animated, Pressable, StyleSheet, View,
  StyleProp, ViewStyle, Platform,
} from 'react-native';

/**
 * Raised — a 3D surface.
 *
 *  ┌───────────┐  ← face   (the part you see and touch)
 *  └───────────┘
 *   ▔▔▔▔▔▔▔▔▔▔▔   ← edge   (solid colour showing the "thickness")
 *     soft glow   ← shadow underneath
 *
 * When pressed, the face sinks down onto the edge, like a physical key.
 * If no onPress is given it renders as a static raised card.
 */

export const THEME3D = {
  // neutral white cards
  white:   { face: '#ffffff', edge: '#dde5f0', glow: '#64748b' },
  // coloured buttons
  blue:    { face: '#2563eb', edge: '#1e40af', glow: '#2563eb' },
  orange:  { face: '#f97316', edge: '#c2410c', glow: '#ea580c' },
  green:   { face: '#10b981', edge: '#047857', glow: '#10b981' },
  purple:  { face: '#7c3aed', edge: '#5b21b6', glow: '#7c3aed' },
  red:     { face: '#ef4444', edge: '#b91c1c', glow: '#ef4444' },
  // soft tinted surfaces
  skyTint:    { face: '#eff6ff', edge: '#bfdbfe', glow: '#2563eb' },
  greenTint:  { face: '#ecfdf5', edge: '#a7f3d0', glow: '#10b981' },
  purpleTint: { face: '#f5f3ff', edge: '#ddd6fe', glow: '#7c3aed' },
  orangeTint: { face: '#fff7ed', edge: '#fed7aa', glow: '#f97316' },
  redTint:    { face: '#fef2f2', edge: '#fecaca', glow: '#ef4444' },
  slateTint:  { face: '#f1f5f9', edge: '#cbd5e1', glow: '#64748b' },
};

/** darken a #rrggbb colour by pct (0-1) — used for the solid edge of coloured surfaces */
export function shade(hex: string, pct = 0.28) {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (v: number) => Math.max(0, Math.round(v * (1 - pct)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

interface RaisedProps {
  children?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  radius?: number;
  /** thickness of the solid edge in px */
  depth?: number;
  face?: string;
  edge?: string;
  glow?: string;
  /** 0 – 1, strength of the soft shadow under the edge */
  glowOpacity?: number;
  /** layout of the outside (flex, margin, width, alignSelf …) */
  style?: StyleProp<ViewStyle>;
  /** layout of the face (padding, flexDirection, alignItems …) */
  faceStyle?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

export default function Raised({
  children, onPress, onLongPress, disabled,
  radius = 16, depth = 4,
  face = THEME3D.white.face,
  edge = THEME3D.white.edge,
  glow = THEME3D.white.glow,
  glowOpacity = 0.16,
  style, faceStyle, hitSlop,
}: RaisedProps) {
  const sink = useRef(new Animated.Value(0)).current;
  const interactive = !!(onPress || onLongPress);

  const pressIn = () =>
    Animated.spring(sink, { toValue: depth - 1, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(sink, { toValue: 0, useNativeDriver: true, speed: 30, bounciness: 8 }).start();

  const body = (
    <View style={s.wrap}>
      {/* solid edge + soft shadow */}
      <View
        pointerEvents="none"
        style={[
          s.base,
          {
            top: depth, borderRadius: radius, backgroundColor: edge,
            shadowColor: glow, shadowOpacity: glowOpacity,
            shadowRadius: 10, shadowOffset: { width: 0, height: depth + 2 },
            elevation: Platform.OS === 'android' ? 3 : 0,
          },
        ]}
      />
      {/* face */}
      <Animated.View
        style={[
          faceStyle,
          { backgroundColor: face, borderRadius: radius, marginBottom: depth, transform: [{ translateY: sink }] },
        ]}
      >
        {/* soft top highlight gives a glossy, rounded feel */}
        <View
          pointerEvents="none"
          style={[s.gloss, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]}
        />
        {children}
      </Animated.View>
    </View>
  );

  // `style` goes on the OUTERMOST element so flex / width / margin / absolute position behave
  if (!interactive) return <View style={style}>{body}</View>;

  return (
    <Pressable
      style={style}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      hitSlop={hitSlop}
    >
      {body}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'relative' },
  base: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  gloss: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
});
