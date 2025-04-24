import { StyleSheet, View, TouchableOpacity, Text, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const COLORS = {
  PRIMARY: '#1a73e8',
  SECONDARY: '#34a853',
  BACKGROUND: '#ffffff',
  TEXT: '#1a1a1a',
  TEXT_SECONDARY: '#666666',
};

export default function LoginScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRoleSelect = (role: 'driver' | 'student') => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.push({
        pathname: '/(tabs)/02nCredentials',
        params: { userType: role }
      });
    });
  };

  return (
    <LinearGradient
      colors={['#ffffff', '#f0f8ff']}
      style={styles.container}
    >
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="bus-school" size={48} color={COLORS.PRIMARY} />
            <Text style={styles.logoText}>KMCE</Text>
          </View>
          <Text style={styles.title}>Welcome to BusCoordinate</Text>
          <Text style={styles.subtitle}>Choose your role to continue</Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.roleButton}
            onPress={() => handleRoleSelect('driver')}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={[COLORS.PRIMARY, '#1557b0']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.roleContent}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="steering" size={32} color={COLORS.PRIMARY} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.roleText}>Driver</Text>
                  <Text style={styles.roleDescription}>Login as a bus driver</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.roleButton}
            onPress={() => handleRoleSelect('student')}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={[COLORS.SECONDARY, '#2d8d47']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.roleContent}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons name="school" size={32} color={COLORS.SECONDARY} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.roleText}>Student</Text>
                  <Text style={styles.roleDescription}>Login as a student</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>
          Select your role to access appropriate features
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: height * 0.05,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 16,
  },
  roleButton: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    backgroundColor: COLORS.BACKGROUND,
  },
  gradientButton: {
    borderRadius: 16,
    padding: 20,
  },
  roleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  roleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.BACKGROUND,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: COLORS.BACKGROUND,
    opacity: 0.9,
  },
  footnote: {
    textAlign: 'center',
    color: COLORS.TEXT_SECONDARY,
    fontSize: 14,
    marginBottom: height * 0.05,
  },
}); 