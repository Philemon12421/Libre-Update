import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
}

export default function Logo({ size = 36 }: LogoProps) {
  return (
    <View style={[styles.shell, { width: size, height: size, borderRadius: size * 0.26 }]}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* White background */}
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="1" stopColor="#f8fafc" stopOpacity="1" />
          </LinearGradient>
          {/* Blue spine */}
          <LinearGradient id="spineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#60a5fa" stopOpacity="1" />
            <Stop offset="1" stopColor="#2563eb" stopOpacity="1" />
          </LinearGradient>
          {/* Book cover - light blue */}
          <LinearGradient id="coverGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#dbeafe" stopOpacity="1" />
            <Stop offset="1" stopColor="#bfdbfe" stopOpacity="1" />
          </LinearGradient>
          {/* Back book */}
          <LinearGradient id="backGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#e0e7ff" stopOpacity="1" />
            <Stop offset="1" stopColor="#c7d2fe" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* White rounded background */}
        <Rect x="0" y="0" width="100" height="100" fill="url(#bgGrad)" rx="26" />

        {/* Subtle shadow base */}
        <Rect x="30" y="25" width="38" height="52" rx="5" fill="#e2e8f0" />

        {/* Back book (indigo tint) */}
        <Rect x="33" y="22" width="38" height="52" rx="5" fill="url(#backGrad)" />

        {/* Book spine */}
        <Rect x="22" y="20" width="11" height="58" rx="4" fill="url(#spineGrad)" />

        {/* Front cover */}
        <Rect x="30" y="20" width="38" height="56" rx="5" fill="url(#coverGrad)" />

        {/* Cover border */}
        <Rect x="30" y="20" width="38" height="56" rx="5"
          fill="none" stroke="#93c5fd" strokeWidth="1" />

        {/* Page top edge */}
        <Rect x="32" y="17" width="34" height="5" rx="2" fill="#f1f5f9" />

        {/* Text lines on cover */}
        <Rect x="37" y="32" width="22" height="3" rx="1.5" fill="#2563eb" opacity="0.8" />
        <Rect x="37" y="39" width="18" height="2" rx="1"   fill="#3b82f6" opacity="0.45" />
        <Rect x="37" y="44" width="20" height="2" rx="1"   fill="#3b82f6" opacity="0.35" />
        <Rect x="37" y="49" width="15" height="2" rx="1"   fill="#3b82f6" opacity="0.3"  />
        <Rect x="37" y="54" width="19" height="2" rx="1"   fill="#3b82f6" opacity="0.25" />

        {/* Accent dot top-right */}
        <Circle cx="70" cy="24" r="6" fill="#2563eb" opacity="0.9" />
        <Circle cx="70" cy="24" r="2" fill="#fff" opacity="1" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
