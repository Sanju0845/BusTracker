import { StyleSheet, View, TouchableOpacity, Text, Dimensions, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const { isDarkMode, toggleTheme, theme } = useTheme();

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
      colors={[theme.BACKGROUND_START, theme.BACKGROUND_END]}
      style={styles.container}
    >
      <TouchableOpacity 
        style={[styles.themeToggle, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
        onPress={toggleTheme}
      >
        <MaterialCommunityIcons 
          name={isDarkMode ? "weather-sunny" : "weather-night"} 
          size={24} 
          color={theme.TEXT}
        />
      </TouchableOpacity>

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
            <Image 
              source={require('../../assets/kmce-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.title, { color: theme.TEXT }]}>Welcome to BusCoordinate</Text>
          <Text style={[styles.subtitle, { color: theme.TEXT_SECONDARY }]}>Choose your role to continue</Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.roleButton}
            onPress={() => handleRoleSelect('driver')}
            activeOpacity={0.95}
          >
            <LinearGradient
              colors={[theme.PRIMARY, '#1557b0']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.roleContent}>
                <View style={[styles.iconContainer, { backgroundColor: theme.BACKGROUND_START }]}>
                  <MaterialCommunityIcons name="steering" size={32} color={theme.PRIMARY} />
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
              colors={[theme.SECONDARY, '#2d8d47']}
              style={styles.gradientButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.roleContent}>
                <View style={[styles.iconContainer, { backgroundColor: theme.BACKGROUND_START }]}>
                  <MaterialCommunityIcons name="school" size={32} color={theme.SECONDARY} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.roleText}>Student</Text>
                  <Text style={styles.roleDescription}>Login as a student</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={[styles.footnote, { color: theme.TEXT_SECONDARY }]}>
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
  themeToggle: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
    borderRadius: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: height * 0.05,
  },
  logoContainer: {
    width: width * 0.4,
    height: height * 0.1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
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
    color: '#ffffff',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  footnote: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: height * 0.05,
  },
}); 