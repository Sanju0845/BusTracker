import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Platform, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Bus {
  id: number;
  bus_number: string;
  route: string;
}

export default function SelectBusScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      console.log('Fetching buses...');
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .order('bus_number');

      if (error) {
        console.error('Error fetching buses:', error);
        setError(error.message);
        throw error;
      }
      
      if (data) {
        console.log('Buses fetched:', data);
        setBuses(data);
      } else {
        console.log('No buses data returned');
        setError('No buses found in the database');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to fetch buses');
    } finally {
      setLoading(false);
    }
  };

  const handleBusSelect = (bus: Bus) => {
    setSelectedBus(bus);
  };

  const handleSelectPress = () => {
    if (selectedBus) {
      router.push({
        pathname: '/(tabs)/03tWeather',
        params: { 
          busId: selectedBus.id,
          busNumber: selectedBus.bus_number
        }
      });
    }
  };

  const handleLogout = async () => {
    try {
      // Clear saved credentials
      await AsyncStorage.removeItem('savedCredentials');
      // Redirect to home screen
      router.push('/01home');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading buses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchBuses}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (buses.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No buses available</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchBuses}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

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

      {/* Header with Logout Button */}
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
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.TEXT} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <ScrollView style={styles.busList}>
          {buses.map((bus) => (
            <TouchableOpacity
              key={bus.id}
              style={[
                styles.busItem,
                { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.CARD_BACKGROUND,
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.BORDER 
                },
                selectedBus?.id === bus.id && styles.selectedBusItem
              ]}
              onPress={() => handleBusSelect(bus)}
            >
              <View style={[
                styles.busIcon,
                { 
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                },
                selectedBus?.id === bus.id && styles.selectedBusIcon
              ]}>
                <Ionicons 
                  name="bus" 
                  size={24} 
                  color={selectedBus?.id === bus.id ? "#FFD700" : theme.TEXT} 
                />
              </View>
              <View style={styles.busInfo}>
                <Text style={[
                  styles.busNumber,
                  { color: theme.TEXT },
                  selectedBus?.id === bus.id && { color: "#FFD700" }
                ]}>Bus {bus.bus_number}</Text>
                <Text style={[
                  styles.busRoute,
                  { color: theme.TEXT_SECONDARY }
                ]}>{bus.route}</Text>
              </View>
              {selectedBus?.id === bus.id && (
                <View style={styles.checkmarkContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#FFD700" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.buttonContainer, { 
          backgroundColor: 'transparent',
          borderTopColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.BORDER 
        }]}>
          <TouchableOpacity 
            style={[
              styles.selectButton,
              { backgroundColor: !selectedBus ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#e5e5e5') : theme.PRIMARY }
            ]}
            onPress={handleSelectPress}
            disabled={!selectedBus}
          >
            <Text style={[styles.selectButtonText, { 
              color: !selectedBus ? theme.TEXT_SECONDARY : '#fff'
            }]}>Track This Bus</Text>
            <Ionicons 
              name="arrow-forward" 
              size={20} 
              color={!selectedBus ? theme.TEXT_SECONDARY : '#fff'} 
              style={styles.buttonIcon} 
            />
          </TouchableOpacity>
        </View>
      </View>
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
  content: {
    flex: 1,
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  busList: {
    flex: 1,
    padding: 16,
  },
  busItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  selectedBusItem: {
    borderColor: '#FFD700',
  },
  busIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedBusIcon: {
    backgroundColor: '#1a1a1a',
  },
  busInfo: {
    flex: 1,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  busRoute: {
    fontSize: 14,
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  selectButton: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
}); 