import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, FlatList, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, {
  Rect, Circle, G, Defs, LinearGradient, Stop, Path,
} from 'react-native-svg';
import Logo from './components/Logo';

const { width, height } = Dimensions.get('window');

interface Props { onFinish: () => void; }

// ── Clean white-theme illustrations ───────────────────────────────────────

function WelcomeIllustration() {
  const cx = width * 0.5;
  const cy = height * 0.22;
  return (
    <Svg width={width} height={height * 0.42} viewBox={`0 0 ${width} ${height * 0.42}`}>
      <Defs>
        <LinearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f0f7ff" stopOpacity="1" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="spine1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#60a5fa" stopOpacity="1" />
          <Stop offset="1" stopColor="#2563eb" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="cover1" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#dbeafe" stopOpacity="1" />
          <Stop offset="1" stopColor="#bfdbfe" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="cover2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#e0e7ff" stopOpacity="1" />
          <Stop offset="1" stopColor="#c7d2fe" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="cover3" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#fce7f3" stopOpacity="1" />
          <Stop offset="1" stopColor="#fbcfe8" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Background */}
      <Rect x="0" y="0" width={width} height={height * 0.42} fill="url(#bg1)" />

      {/* Subtle circle glow */}
      <Circle cx={cx} cy={cy} r="130" fill="#2563eb" opacity="0.04" />
      <Circle cx={cx} cy={cy} r="90"  fill="#2563eb" opacity="0.04" />

      {/* Book 3 - back */}
      <G transform={`translate(${cx - 68}, ${cy - 80})`}>
        <Rect x="0" y="0" width="110" height="148" rx="8" fill="#f1f5f9" />
        <Rect x="0" y="0" width="10"  height="148" rx="4" fill="#ec4899" opacity="0.7" />
        <Rect x="16" y="20" width="60" height="5"  rx="2.5" fill="#f9a8d4" opacity="0.8" />
        <Rect x="16" y="30" width="48" height="4"  rx="2"   fill="#f9a8d4" opacity="0.5" />
        <Rect x="16" y="39" width="54" height="4"  rx="2"   fill="#f9a8d4" opacity="0.4" />
      </G>

      {/* Book 2 - middle */}
      <G transform={`translate(${cx - 48}, ${cy - 88})`}>
        <Rect x="0" y="0" width="112" height="152" rx="8" fill="#f8fafc" />
        <Rect x="0" y="0" width="11"  height="152" rx="4" fill="url(#cover2)" />
        <Rect x="0" y="0" width="112" height="152" rx="8" fill="none" stroke="#c7d2fe" strokeWidth="1" />
        <Rect x="18" y="22" width="64" height="5"  rx="2.5" fill="#6366f1" opacity="0.5" />
        <Rect x="18" y="32" width="50" height="4"  rx="2"   fill="#a5b4fc" opacity="0.5" />
        <Rect x="18" y="41" width="56" height="4"  rx="2"   fill="#a5b4fc" opacity="0.4" />
      </G>

      {/* Book 1 - front */}
      <G transform={`translate(${cx - 28}, ${cy - 96})`}>
        <Rect x="0" y="0" width="114" height="156" rx="8" fill="#fff" />
        <Rect x="0" y="0" width="12"  height="156" rx="4" fill="url(#spine1)" />
        <Rect x="0" y="0" width="114" height="156" rx="8" fill="none" stroke="#93c5fd" strokeWidth="1.5" />
        {/* Page top */}
        <Rect x="2" y="-4" width="96" height="7" rx="3" fill="#f1f5f9" />
        {/* Title line */}
        <Rect x="20" y="22" width="72" height="7"  rx="3.5" fill="#2563eb" opacity="0.85" />
        <Rect x="20" y="34" width="58" height="4"  rx="2"   fill="#93c5fd" opacity="0.6" />
        <Rect x="20" y="43" width="64" height="4"  rx="2"   fill="#93c5fd" opacity="0.5" />
        <Rect x="20" y="52" width="50" height="4"  rx="2"   fill="#93c5fd" opacity="0.4" />
        <Rect x="20" y="61" width="60" height="4"  rx="2"   fill="#93c5fd" opacity="0.35" />
        <Rect x="20" y="70" width="44" height="4"  rx="2"   fill="#93c5fd" opacity="0.3" />
        {/* Bookmark ribbon */}
        <Rect x="86" y="0" width="10" height="28" rx="2" fill="#2563eb" opacity="0.8" />
        <Path d={`M86,22 L91,28 L96,22`} fill="#1d4ed8" opacity="0.8" />
      </G>

      {/* Floating dots */}
      <Circle cx={width*0.12} cy={height*0.1}  r="5" fill="#93c5fd" opacity="0.5" />
      <Circle cx={width*0.85} cy={height*0.15} r="4" fill="#c7d2fe" opacity="0.6" />
      <Circle cx={width*0.1}  cy={height*0.32} r="3" fill="#2563eb" opacity="0.2" />
      <Circle cx={width*0.88} cy={height*0.35} r="3" fill="#6366f1" opacity="0.2" />
    </Svg>
  );
}

function OrganizeIllustration() {
  const cx = width * 0.5;
  return (
    <Svg width={width} height={height * 0.42} viewBox={`0 0 ${width} ${height * 0.42}`}>
      <Defs>
        <LinearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f5f3ff" stopOpacity="1" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height * 0.42} fill="url(#bg2)" />
      <Circle cx={cx} cy={height*0.21} r="130" fill="#7c3aed" opacity="0.04" />

      {/* Folder stack */}
      {[
        { dx: -60, dy: 30,  tabColor: '#2563eb', bodyColor: '#eff6ff', border: '#bfdbfe', lines: '#93c5fd' },
        { dx:  10, dy: 10,  tabColor: '#7c3aed', bodyColor: '#f5f3ff', border: '#c4b5fd', lines: '#a5b4fc' },
        { dx: -25, dy: -50, tabColor: '#10b981', bodyColor: '#ecfdf5', border: '#6ee7b7', lines: '#34d399' },
      ].map((f, i) => (
        <G key={i} transform={`translate(${cx + f.dx}, ${height*0.18 + f.dy})`}>
          {/* Folder tab */}
          <Rect x="0" y="0"  width="50" height="10" rx="5" fill={f.tabColor} opacity="0.9" />
          {/* Folder body */}
          <Rect x="-5" y="8" width="118" height="76" rx="12" fill={f.bodyColor} />
          <Rect x="-5" y="8" width="118" height="76" rx="12" fill="none" stroke={f.border} strokeWidth="1.5" />
          {/* Lines */}
          <Rect x="12" y="26" width="68" height="5" rx="2.5" fill={f.lines} opacity="0.8" />
          <Rect x="12" y="36" width="52" height="4" rx="2"   fill={f.lines} opacity="0.5" />
          <Rect x="12" y="45" width="60" height="4" rx="2"   fill={f.lines} opacity="0.4" />
          {/* Count badge */}
          <Rect x="82" y="52" width="24" height="18" rx="8" fill={f.tabColor} opacity="0.15" />
          <Rect x="82" y="52" width="24" height="18" rx="8" fill="none" stroke={f.tabColor} strokeWidth="1" />
        </G>
      ))}

      {/* Tag chips */}
      {[
        { x: width*0.06, y: height*0.36, color: '#3b82f6', label: '#work'    },
        { x: width*0.58, y: height*0.38, color: '#10b981', label: '#notes'   },
        { x: width*0.2,  y: height*0.41, color: '#7c3aed', label: '#archive' },
      ].map((t, i) => (
        <G key={i}>
          <Rect x={t.x} y={t.y} width={68} height={24} rx="12"
            fill={t.color} opacity="0.1" />
          <Rect x={t.x} y={t.y} width={68} height={24} rx="12"
            fill="none" stroke={t.color} strokeWidth="1" opacity="0.4" />
        </G>
      ))}

      <Circle cx={width*0.9}  cy={height*0.08} r="5" fill="#c4b5fd" opacity="0.6" />
      <Circle cx={width*0.08} cy={height*0.2}  r="4" fill="#93c5fd" opacity="0.5" />
    </Svg>
  );
}

function PrivacyIllustration() {
  const cx = width * 0.5;
  const cy = height * 0.2;
  return (
    <Svg width={width} height={height * 0.42} viewBox={`0 0 ${width} ${height * 0.42}`}>
      <Defs>
        <LinearGradient id="bg3" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ecfdf5" stopOpacity="1" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="1" />
        </LinearGradient>
        <LinearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#d1fae5" stopOpacity="1" />
          <Stop offset="1" stopColor="#a7f3d0" stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={width} height={height * 0.42} fill="url(#bg3)" />

      {/* Rings */}
      {[160, 120, 85, 52].map((r, i) => (
        <Circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke="#10b981"
          strokeWidth={i === 3 ? 2 : 1}
          opacity={0.06 + i * 0.07} />
      ))}

      {/* Shield */}
      <Path
        d={`M${cx},${cy-68} L${cx+50},${cy-42} L${cx+50},${cy+8} Q${cx+50},${cy+58} ${cx},${cy+72} Q${cx-50},${cy+58} ${cx-50},${cy+8} L${cx-50},${cy-42} Z`}
        fill="url(#shieldFill)" stroke="#6ee7b7" strokeWidth="2"
      />

      {/* Lock body */}
      <Rect x={cx-15} y={cy-4} width="30" height="24" rx="6" fill="#10b981" opacity="0.9" />
      {/* Shackle */}
      <Path
        d={`M${cx-9},${cy-4} L${cx-9},${cy-16} Q${cx-9},${cy-26} ${cx},${cy-26} Q${cx+9},${cy-26} ${cx+9},${cy-16} L${cx+9},${cy-4}`}
        fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round"
      />
      {/* Keyhole */}
      <Circle cx={cx} cy={cy+6} r="4" fill="#ecfdf5" />
      <Rect x={cx-1.5} y={cy+8} width="3" height="7" rx="1.5" fill="#ecfdf5" />

      {/* Badges */}
      {[
        { x: width*0.05, y: height*0.05, label: 'LOCAL',     color: '#10b981' },
        { x: width*0.62, y: height*0.07, label: 'PRIVATE',   color: '#3b82f6' },
        { x: width*0.05, y: height*0.35, label: 'NO CLOUD',  color: '#7c3aed' },
        { x: width*0.62, y: height*0.35, label: 'ENCRYPTED', color: '#059669' },
      ].map((b, i) => (
        <G key={i}>
          <Rect x={b.x} y={b.y} width={82} height={26} rx="13"
            fill={b.color} opacity="0.1" />
          <Rect x={b.x} y={b.y} width={82} height={26} rx="13"
            fill="none" stroke={b.color} strokeWidth="1" opacity="0.4" />
        </G>
      ))}

      <Circle cx={width*0.88} cy={height*0.4} r="5" fill="#6ee7b7" opacity="0.5" />
      <Circle cx={width*0.1}  cy={height*0.4} r="4" fill="#34d399" opacity="0.4" />
    </Svg>
  );
}

// ── Slide data ─────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: '1',
    tag: 'WELCOME',
    title: 'Your Personal\nArchive Node',
    description: 'Store, organize, and retrieve every document, note, and file — all kept privately on your device. No cloud. No tracking.',
    accent: '#2563eb',
    illustration: WelcomeIllustration,
  },
  {
    id: '2',
    tag: 'ORGANIZE',
    title: 'Smart Folders\n& Tags',
    description: 'Color-coded folders, instant search, tags, and sort options — everything exactly where you left it.',
    accent: '#7c3aed',
    illustration: OrganizeIllustration,
  },
  {
    id: '3',
    tag: 'PRIVATE',
    title: '100% Local.\nAlways Private.',
    description: 'Your data never leaves your device. No accounts, no servers, no subscriptions. Libre is yours — completely.',
    accent: '#10b981',
    illustration: PrivacyIllustration,
  },
];

// ── Main component ─────────────────────────────────────────────────────────

export default function OnboardingScreen({ onFinish }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      const next = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setActiveIndex(next);
    } else {
      onFinish();
    }
  };

  const isLast  = activeIndex === SLIDES.length - 1;
  const accent  = SLIDES[activeIndex].accent;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Logo size={36} />
        <TouchableOpacity
          onPress={onFinish}
          style={styles.skipBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={e => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => {
          const Illustration = item.illustration;
          return (
            <View style={styles.slide}>
              {/* Illustration */}
              <View style={styles.illustrationWrap}>
                <Illustration />
              </View>

              {/* Text content card */}
              <View style={styles.textCard}>
                <View style={[styles.tagPill, { borderColor: item.accent + '33', backgroundColor: item.accent + '12' }]}>
                  <View style={[styles.tagDot, { backgroundColor: item.accent }]} />
                  <Text style={[styles.tagText, { color: item.accent }]}>{item.tag}</Text>
                </View>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideDesc}>{item.description}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => {
            const w = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [6, 24, 6],
              extrapolate: 'clamp',
            });
            const op = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0.25, 1, 0.25],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: w, opacity: op, backgroundColor: s.accent }]}
              />
            );
          })}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          onPress={goNext}
          activeOpacity={0.85}
          style={[styles.cta, { backgroundColor: accent }]}
        >
          <Text style={styles.ctaText}>{isLast ? 'GET STARTED' : 'CONTINUE'}</Text>
          {!isLast && (
            <View style={styles.ctaArrow}>
              <Text style={styles.ctaArrowText}>→</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.stepText}>{activeIndex + 1} of {SLIDES.length}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 44 : 54,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  skipBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  skipText: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.5 },

  slide: { width },

  illustrationWrap: {
    height: height * 0.42,
    width,
    overflow: 'hidden',
  },

  textCard: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 8,
  },
  tagPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, marginBottom: 14,
  },
  tagDot:  { width: 5, height: 5, borderRadius: 2.5 },
  tagText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  slideTitle: {
    fontSize: 28, fontWeight: '900', color: '#0f172a',
    lineHeight: 35, letterSpacing: -0.5, marginBottom: 12,
  },
  slideDesc: {
    fontSize: 14, fontWeight: '500', color: '#64748b', lineHeight: 22,
  },

  bottomBar: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 12,
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },

  cta: {
    width: '100%', height: 54, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25, shadowRadius: 14, elevation: 8,
  },
  ctaText:      { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  ctaArrow: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaArrowText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  stepText: { fontSize: 10, fontWeight: '700', color: '#cbd5e1', letterSpacing: 1 },
});
