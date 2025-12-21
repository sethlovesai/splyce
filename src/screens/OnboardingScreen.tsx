import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ListRenderItem,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

type OnboardingSlide = {
  key: string;
  title: string;
  subtitle: string;
  body: string;
  cta: string;
  image?: number;
  showBack?: boolean;
};

const ONBOARDING_KEY = 'splyce:onboarding_complete';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const slides: OnboardingSlide[] = [
  {
    key: 'scan',
    title: 'Scan the receipt',
    subtitle: 'Take a clear photo of your receipt.',
    body:
      "We'll automatically pull out the items, prices, tax, tip, and total so you don't have to type anything.",
    cta: 'Next',
  },
  {
    key: 'choose-1',
    title: 'Choose what you ordered',
    subtitle: 'Tap the dishes and drinks you had.',
    body:
      'Then pass the phone around so each friend can quickly select theirs too — shared items can be split.',
    cta: 'Next',
  },
  {
    key: 'choose-2',
    title: 'Choose what you ordered',
    subtitle: 'Each person selects their dishes.',
    body: 'It keeps everything organized so the split is fast and accurate.',
    cta: "That's everyone!",
  },
  {
    key: 'owe',
    title: 'Who Owes What',
    subtitle: 'See a clear breakdown.',
    body: "Review each person's items and costs before settling up.",
    cta: "That's everyone!",
  },
  {
    key: 'settle',
    title: 'Time to Settle Up',
    subtitle: 'Send the totals in one tap.',
    body:
      'Get a simple breakdown of what each person owes, including shared items, tax, and tip.',
    cta: 'Continue',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList<OnboardingSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const viewConfig = useMemo(
    () => ({
      viewAreaCoveragePercentThreshold: 55,
    }),
    [],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const nextIndex = viewableItems[0]?.index ?? 0;
      setActiveIndex(nextIndex);
    },
  );

  const handleNext = async () => {
    if (activeIndex < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
      return;
    }

    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/Home');
  };

  const handleBack = () => {
    if (activeIndex > 0) {
      listRef.current?.scrollToIndex({ index: activeIndex - 1, animated: true });
    }
  };

  const renderItem: ListRenderItem<OnboardingSlide> = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.topRow}>
        <TouchableOpacity
          style={[styles.backButton, activeIndex === 0 && styles.backButtonHidden]}
          onPress={handleBack}
          disabled={activeIndex === 0}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={20} color="#5b4ddb" />
        </TouchableOpacity>
      </View>

      <View style={styles.imageWrap}>
        {item.image ? (
          <Image source={item.image} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="receipt-outline" size={64} color="#b8b3f1" />
          </View>
        )}
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={listRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewConfig}
        getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((slide, index) => (
            <View
              key={slide.key}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.ctaButton} onPress={handleNext} activeOpacity={0.9}>
          <Text style={styles.ctaText}>{slides[activeIndex]?.cta ?? 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f2ff',
  },
  slide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    paddingTop: 10,
    flex: 1,
  },
  topRow: {
    height: 32,
    justifyContent: 'center',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonHidden: {
    opacity: 0,
  },
  imageWrap: {
    flex: 1.1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  image: {
    width: '90%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '88%',
    height: '80%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ddd8ff',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2a2268',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#5b4ddb',
    textAlign: 'center',
    fontWeight: '700',
  },
  body: {
    marginTop: 10,
    fontSize: 14,
    color: '#7b74b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginBottom: 14,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d7d2ff',
  },
  dotActive: {
    width: 22,
    backgroundColor: '#5b4ddb',
  },
  ctaButton: {
    backgroundColor: '#5b4ddb',
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
  },
  ctaText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
});
