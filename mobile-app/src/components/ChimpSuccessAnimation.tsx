import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';

interface ChimpSuccessAnimationProps {
  visible: boolean;
  onAnimationComplete: () => void;
}

const { width, height } = Dimensions.get('window');

export default function ChimpSuccessAnimation({
  visible,
  onAnimationComplete,
}: ChimpSuccessAnimationProps) {
  const scaleValue = useSharedValue(0);
  const opacityValue = useSharedValue(0);
  const checkmarkScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Start animation sequence
      scaleValue.value = withSpring(1, { damping: 15 });
      opacityValue.value = withTiming(1, { duration: 300 });

      // Animate checkmark with bounce effect
      setTimeout(() => {
        checkmarkScale.value = withSequence(
          withSpring(1.3, { damping: 8 }),
          withSpring(1, { damping: 12 })
        );
      }, 100);

      // Complete animation after 1.2 seconds
      setTimeout(() => {
        runOnJS(onAnimationComplete)();
      }, 1200);
    } else {
      // Reset values
      scaleValue.value = 0;
      opacityValue.value = 0;
      checkmarkScale.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacityValue.value,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Green Checkmark Only */}
        <Animated.View style={[styles.checkmarkContainer, containerStyle]}>
          <Animated.View style={[styles.checkmarkCircle, checkmarkStyle]}>
            <Text style={styles.checkmark}>✔</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(55, 65, 81, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1DB330',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  checkmark: {
    fontSize: 38,
    color: 'white',
    fontWeight: '300',
    fontFamily: 'Poppins-Regular',
  },
});
