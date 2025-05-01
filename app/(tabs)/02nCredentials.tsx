import { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function CredentialsScreen() {
  const router = useRouter();
  const { userType } = useLocalSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { theme, isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    // Check for saved credentials
    const loadSavedCredentials = async () => {
      try {
        const savedCredentials = await AsyncStorage.getItem('savedCredentials');
        if (savedCredentials) {
          const { username: savedUsername, password: savedPassword, userType: savedUserType } = JSON.parse(savedCredentials);
          if (savedUserType === userType) {
            setUsername(savedUsername);
            setPassword(savedPassword);
            setRememberMe(true);
          }
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
      }
    };

    loadSavedCredentials();
  }, [userType]);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      // Check for admin credentials first
      if (username.toLowerCase() === 'admin' && password === 'admin') {
        await AsyncStorage.setItem('isAdminLoggedIn', 'true');
        router.replace('/admin/dashboard');
        return;
      }

      // Check for king credentials
      if (username.toLowerCase() === 'king' && password === 'kong') {
        await AsyncStorage.setItem('isKingLoggedIn', 'true');
        router.replace('/king/dashboard');
        return;
      }

      const table = userType === 'student' ? 'student_profiles' : 'driver_profiles';
      
      // Check if the user exists
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('username', username)
        .eq('password', password);

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        // Save credentials if remember me is checked
        if (rememberMe) {
          await AsyncStorage.setItem('savedCredentials', JSON.stringify({
            username,
            password,
            userType
          }));
        } else {
          await AsyncStorage.removeItem('savedCredentials');
        }

        // Store user info in secure storage or state management
        if (userType === 'student') {
          router.push('/(tabs)/03selectbus');
        } else {
          // For drivers, get their assigned bus number
          const { data: driverData, error: driverError } = await supabase
            .from('driver_profiles')
            .select('bus_number')
            .eq('username', username)
            .single();

          if (driverError) {
            console.error('Error fetching driver bus:', driverError);
            Alert.alert('Error', 'Could not fetch assigned bus');
            return;
          }

          if (driverData && driverData.bus_number) {
            console.log('Driver bus number:', driverData.bus_number);
            router.push({
              pathname: '/driver/04Locshare',
              params: { busId: driverData.bus_number }
            });
          } else {
            Alert.alert('Error', 'No bus assigned to this driver');
          }
        }
      } else {
        Alert.alert('Error', 'Invalid credentials. Please check your username and password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
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

      {/* Header */}
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <View style={[styles.backButtonContent, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Ionicons name="chevron-back" size={24} color={theme.TEXT} />
          </View>
        </TouchableOpacity>
        <Image
          source={require('../../assets/kmce-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerWelcome, { color: theme.TEXT }]}>Welcome Back!</Text>
          <Text style={[styles.headerSubtitle, { color: theme.TEXT_SECONDARY }]}>
            {userType === 'student' ? 'Student Login' : 'Driver Login'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.formContainer}>
          <View style={[styles.formCard, { 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.CARD_BACKGROUND,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.BORDER
          }]}>
            <View style={[styles.inputContainer, { 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.BORDER
            }]}>
              <View style={[styles.inputIconContainer, { 
                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : theme.PRIMARY 
              }]}>
                <Ionicons name="person-outline" size={20} color="#FFD700" />
              </View>
              <TextInput
                style={[styles.input, { color: theme.TEXT }]}
                placeholder={userType === 'student' ? "Roll Number" : "Driver ID"}
                placeholderTextColor={theme.TEXT_SECONDARY}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[styles.inputContainer, { 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.BORDER
            }]}>
              <View style={[styles.inputIconContainer, { 
                backgroundColor: isDarkMode ? 'rgba(0,0,0,0.3)' : theme.PRIMARY 
              }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#FFD700" />
              </View>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: theme.TEXT }]}
                placeholder="Password"
                placeholderTextColor={theme.TEXT_SECONDARY}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            </View>

            {/* Remember Me Switch */}
            <View style={styles.rememberMeContainer}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                trackColor={{ false: '#767577', true: theme.PRIMARY }}
                thumbColor={rememberMe ? '#fff' : '#f4f3f4'}
              />
              <Text style={[styles.rememberMeText, { color: theme.TEXT }]}>
                Remember Me
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.loginButton,
                { backgroundColor: (!username || !password) ? 
                    (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e5e5') : 
                    theme.PRIMARY 
                }
              ]}
              onPress={handleLogin}
              disabled={loading || !username || !password}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={[styles.loginButtonText, { 
                    color: (!username || !password) ? theme.TEXT_SECONDARY : '#fff'
                  }]}>Login</Text>
                  <Ionicons 
                    name="arrow-forward" 
                    size={20} 
                    color={(!username || !password) ? theme.TEXT_SECONDARY : '#fff'}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.footerText, { color: theme.TEXT_SECONDARY }]}>
          KMCE Bus Tracking System
        </Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 56,
    paddingBottom: 12,
    height: Platform.OS === 'ios' ? 100 : 116,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonContent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 40,
    marginLeft: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerWelcome: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  formCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputIconContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordInput: {
    paddingRight: 50,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 12,
    height: 50,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 14,
  },
}); 