// OnboardingScreen.js
import React, { useRef, useState } from "react";
import { View, FlatList, StyleSheet, Dimensions, Animated, Image } from "react-native";
import Text from "../components/Text";
import Button from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";

const SLIDE_IMAGES = {
  whisper: require("../../assets/onbwhisper.png"),
  verify:  require("../../assets/onbverify.png"),
  vote:    require("../../assets/onbvote.png"),
  react:   require("../../assets/onbreaction.png"),
};

const slides = [
  {
    key: "whisper",
    title: "Spill the tea, stay low‑key",
    desc: "Whisper mode on. Share and react without losing your cool.",
    image: SLIDE_IMAGES.whisper,
    gradientColors: ['#8b16ff15', '#8b16ff08'],
  },
  {
    key: "verify",
    title: "Verify & enter your circle", 
    desc: "Real uni communities only. Quick selfie check for safety.",
    image: SLIDE_IMAGES.verify,
    gradientColors: ['#26d08c15', '#26d08c08'],
  },
  {
    key: "vote",
    title: "Vote, save, repost",
    desc: "Upvote, downvote, bookmark, and keep the receipts.",
    image: SLIDE_IMAGES.vote,
    gradientColors: ['#f23e5215', '#f23e5208'],
  },
  {
    key: "react",
    title: "React like a pro",
    desc: "Shock, laugh, or smirk—your vibe, your feed.",
    image: SLIDE_IMAGES.react,
    gradientColors: ['#8b16ff15', '#8b16ff08'],
  },
];

export default function OnboardingScreen({ navigation }) {
  const { theme } = useTheme();
  const flatListRef = useRef();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [screenData, setScreenData] = useState(Dimensions.get("window"));
  const width = screenData.width;
  const scrollX = useRef(new Animated.Value(0)).current;

  // Handle screen dimension changes
  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove?.();
  }, []);
  
  // Animation values for smoother transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const nextSlide = () => {
    if (currentIndex < slides.length - 1 && width > 0) {
      // Add subtle animation feedback
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]),
      ]).start();
      
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const Indicator = ({ scrollX }) => (
    <View style={styles.indicatorContainer}>
      {slides.map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
        
        const scale = scrollX.interpolate({
          inputRange,
          outputRange: [0.6, 1.2, 0.6],
          extrapolate: "clamp",
        });
        
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: "clamp",
        });
        
        const indicatorWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: "clamp",
        });

        return (
          <Animated.View
            key={i.toString()}
            style={[
              styles.indicator,
              {
                backgroundColor: theme.colors.accent,
                transform: [{ scale }],
                opacity,
                width: indicatorWidth,
              },
            ]}
          />
        );
      })}
    </View>
  );

  const renderSlide = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.slide, 
        { 
          width,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      {/* Enhanced image container with soft background */}
      <View style={[
        styles.illustrationContainer,
        { 
          backgroundColor: theme.mode === 'dark' 
            ? theme.colors.surface 
            : item.gradientColors[0]
        }
      ]}>
        <View style={styles.illustrationWrap}>
          {item.image ? (
            <Image
              source={item.image}
              style={styles.illustration}
              resizeMode="contain"
            />
          ) : (
            <View style={[
              styles.illustration, 
              { 
                backgroundColor: theme.colors.accent + "20", 
                justifyContent: "center", 
                alignItems: "center" 
              }
            ]}>
              <Text style={{ color: theme.colors.accent, fontSize: 16 }}>
                Image Placeholder
              </Text>
            </View>
          )}
        </View>
        
        {/* Subtle decorative elements */}
        <View style={[
          styles.decorativeCircle1,
          { backgroundColor: theme.colors.accent + "10" }
        ]} />
        <View style={[
          styles.decorativeCircle2,
          { backgroundColor: theme.colors.accent + "05" }
        ]} />
      </View>

      {/* Enhanced text content */}
      <View style={styles.textContent}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.description, { color: theme.colors.secondary }]}>
          {item.desc}
        </Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      {/* Enhanced background decorations */}
      <View style={[
        styles.bgDecoration1, 
        { 
          backgroundColor: theme.colors.accent + (theme.mode === 'dark' ? "08" : "12"),
        }
      ]} />
      <View style={[
        styles.bgDecoration2, 
        { 
          backgroundColor: theme.colors.accent + (theme.mode === 'dark' ? "05" : "0A"),
        }
      ]} />
      <View style={[
        styles.bgDecoration3, 
        { 
          backgroundColor: theme.colors.greenFlag + (theme.mode === 'dark' ? "06" : "0A"),
        }
      ]} />

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={renderSlide}
        bounces={false}
        decelerationRate="fast"
      />

      <Indicator scrollX={scrollX} />

      {/* Enhanced button container */}
      <View style={[
        styles.buttonContainer,
        { 
          backgroundColor: theme.mode === 'dark' 
            ? theme.colors.surface + "50" 
            : theme.colors.primary + "95",
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }
      ]}>
        {currentIndex === slides.length - 1 ? (
          <View style={styles.finalButtons}>
            <Button 
              style={[
                styles.primaryButton, 
                { 
                  width: width * 0.85,
                  backgroundColor: theme.colors.accent,
                  shadowColor: theme.colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: theme.mode === 'dark' ? 0.3 : 0.25,
                  shadowRadius: 8,
                  elevation: 6,
                }
              ]} 
              onPress={() => navigation.replace("SignUp")}
            >
              <Text style={[styles.primaryButtonText, { color: '#ffffff' }]}>
                Get Started
              </Text>
            </Button>
            
            <Button
              style={[
                styles.secondaryButton,
                { 
                  width: width * 0.85, 
                  backgroundColor: "transparent", 
                  borderWidth: 2, 
                  borderColor: theme.colors.accent + "60",
                },
              ]}
              onPress={() => navigation.replace("Login")}
            >
              <Text style={[
                styles.secondaryButtonText,
                { color: theme.colors.accent }
              ]}>
                I have an account
              </Text>
            </Button>
          </View>
        ) : (
          <View style={styles.navigationButtons}>
            <Button 
              style={[styles.skipButton, { backgroundColor: "transparent" }]} 
              onPress={() => navigation.replace("SignUp")}
            >
              <Text style={[
                styles.skipButtonText,
                { color: theme.colors.secondary + "80" }
              ]}>
                Skip
              </Text>
            </Button>
            
            <Button 
              style={[
                styles.nextButton, 
                { 
                  backgroundColor: theme.colors.accent,
                  shadowColor: theme.colors.accent,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                }
              ]} 
              onPress={nextSlide}
            >
              <Text style={[styles.nextButtonText, { color: '#ffffff' }]}>
                Next
              </Text>
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const ILLUSTRATION_MAX_WIDTH = Math.min(screenWidth * 0.8, 380);
const ILLUSTRATION_MAX_HEIGHT = Math.min(screenHeight * 0.35, 320);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    position: "relative",
  },
  
  // Background decorations
  bgDecoration1: { 
    position: "absolute", 
    width: 280, 
    height: 280, 
    borderRadius: 140, 
    top: -80, 
    right: -100,
  },
  bgDecoration2: { 
    position: "absolute", 
    width: 200, 
    height: 200, 
    borderRadius: 100, 
    bottom: 120, 
    left: -60,
  },
  bgDecoration3: { 
    position: "absolute", 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    top: screenHeight * 0.3, 
    right: -30,
  },

  // Slide content
  slide: { 
    alignItems: "center", 
    justifyContent: "flex-start", 
    paddingHorizontal: 24, 
    paddingTop: 80,
    paddingBottom: 40,
  },
  
  illustrationContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    marginBottom: 40,
    paddingVertical: 32,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "hidden",
  },
  
  illustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    zIndex: 2,
  },
  
  illustration: {
    width: ILLUSTRATION_MAX_WIDTH,
    height: ILLUSTRATION_MAX_HEIGHT,
    maxWidth: "100%",
  },
  
  decorativeCircle1: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 20,
    right: 20,
    zIndex: 1,
  },
  
  decorativeCircle2: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    bottom: 30,
    left: 30,
    zIndex: 1,
  },

  // Text content
  textContent: { 
    alignItems: "center", 
    paddingHorizontal: 20,
    maxWidth: screenWidth - 48,
  },
  
  title: { 
    fontSize: 30, 
    fontWeight: "800", 
    textAlign: "center", 
    marginBottom: 16, 
    lineHeight: 36, 
    letterSpacing: -0.5,
  },
  
  description: { 
    fontSize: 18, 
    textAlign: "center", 
    lineHeight: 26, 
    opacity: 0.85, 
    letterSpacing: 0.2,
  },

  // Indicators
  indicatorContainer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: 20,
    paddingVertical: 20,
  },
  
  indicator: { 
    height: 8, 
    borderRadius: 4, 
    marginHorizontal: 6,
  },

  // Buttons
  buttonContainer: { 
    paddingHorizontal: 24, 
    paddingTop: 20,
    paddingBottom: 50,
  },
  
  finalButtons: { 
    alignItems: "center",
    gap: 16,
  },
  
  primaryButton: { 
    paddingVertical: 20,
    borderRadius: 16,
  },
  
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  
  secondaryButton: { 
    paddingVertical: 20,
    borderRadius: 16,
  },
  
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  
  navigationButtons: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 8,
  },
  
  skipButton: { 
    paddingVertical: 16, 
    paddingHorizontal: 24,
  },
  
  skipButtonText: {
    fontSize: 17,
    fontWeight: "500",
  },
  
  nextButton: { 
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    minWidth: 120,
  },
  
  nextButtonText: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});