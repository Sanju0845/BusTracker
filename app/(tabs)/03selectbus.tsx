import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface Bus {
  id: number;
  bus_number: string;
  route: string;
}

export default function SelectBusScreen() {
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
        pathname: '/(tabs)/04busroute',
        params: { 
          busId: selectedBus.id,
          busNumber: selectedBus.bus_number
        }
      });
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
    <SafeAreaView style={styles.container}>
      {/* Modern Floating Header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <View style={styles.backButtonContent}>
            <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Select Bus</Text>
          <Text style={styles.headerSubtitle}>Choose your bus route</Text>
        </View>
      </View>

      <View style={styles.content}>
        <ScrollView style={styles.busList}>
          {buses.map((bus) => (
            <TouchableOpacity
              key={bus.id}
              style={[
                styles.busItem,
                selectedBus?.id === bus.id && styles.selectedBusItem
              ]}
              onPress={() => handleBusSelect(bus)}
            >
              <View style={[
                styles.busIcon,
                selectedBus?.id === bus.id && styles.selectedBusIcon
              ]}>
                <Ionicons 
                  name="bus" 
                  size={24} 
                  color={selectedBus?.id === bus.id ? "#FFD700" : "#1a1a1a"} 
                />
              </View>
              <View style={styles.busInfo}>
                <Text style={[
                  styles.busNumber,
                  selectedBus?.id === bus.id && styles.selectedText
                ]}>Bus {bus.bus_number}</Text>
                <Text style={[
                  styles.busRoute,
                  selectedBus?.id === bus.id && styles.selectedRouteText
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

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[
              styles.selectButton,
              !selectedBus && styles.disabledButton
            ]}
            onPress={handleSelectPress}
            disabled={!selectedBus}
          >
            <Text style={styles.selectButtonText}>Track This Bus</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    marginTop: 100,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#fff',
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonContent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  selectedBusItem: {
    backgroundColor: '#fffdf0',
    borderColor: '#FFD700',
  },
  busIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
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
    color: '#1a1a1a',
    marginBottom: 4,
  },
  selectedText: {
    color: '#1a1a1a',
  },
  busRoute: {
    fontSize: 14,
    color: '#666',
  },
  selectedRouteText: {
    color: '#666',
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  selectButton: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#e5e5e5',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
}); 