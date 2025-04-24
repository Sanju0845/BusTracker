import { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { supabase } from '../../lib/supabase';

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export default function DriverTrackingScreen() {
  const router = useRouter();
  const { busNumber } = useLocalSearchParams();
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);

  const [region, setRegion] = useState({
    latitude: 17.3685468, // Chaitanyapuri coordinates
    longitude: 78.5329092,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      } catch (err) {
        console.error('Error getting location:', err);
        // Keep default region if location fails
      }
    })();
  }, []);

  const requestLocationPermission = async () => {
    try {
      setError(null);
      
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions in your device settings to track the bus.',
          [{ text: 'OK', onPress: () => setError('Location permission is required to track the bus') }]
        );
        return;
      }

      if (Platform.OS === 'android') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          Alert.alert(
            'Background Location',
            'Background location permission is required for continuous tracking. Please enable it in settings.',
            [{ text: 'OK', onPress: () => startLocationTracking() }]
          );
        }
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings.',
          [{ text: 'OK', onPress: () => setError('Location services must be enabled') }]
        );
        return;
      }

      startLocationTracking();
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setError('Failed to get location permissions');
    }
  };

  const startLocationTracking = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
      };

      setCurrentLocation(locationData);
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      updateLocationInDatabase(locationData);

      // Start watching position with more battery-friendly settings
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 20, // Update every 20 meters
        },
        (location) => {
          const newLocationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: Date.now(),
          };
          setCurrentLocation(newLocationData);
          setRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
          updateLocationInDatabase(newLocationData);
        }
      );

      setIsTracking(true);
    } catch (err) {
      console.error('Error starting location tracking:', err);
      setError('Failed to start location tracking');
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  const updateLocationInDatabase = async (locationData: LocationData) => {
    try {
      const { data: existingData, error: fetchError } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('bus_number', busNumber)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching location:', fetchError);
        return;
      }

      const locationUpdate = {
        bus_number: busNumber,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        last_updated: new Date().toISOString(),
      };

      if (existingData) {
        const { error } = await supabase
          .from('bus_locations')
          .update(locationUpdate)
          .eq('bus_number', busNumber);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('bus_locations')
          .insert([locationUpdate]);

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error updating location in database:', err);
      // Don't set error state here to avoid UI disruption
    }
  };

  const handleMapReady = () => {
    console.log('Map is ready');
    setIsMapReady(true);
  };

  return (
    <View style={styles.container}>
      {/* Modern Floating Header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            stopLocationTracking();
            router.back();
          }}
        >
          <View style={styles.backButtonContent}>
            <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Bus {busNumber}</Text>
          <Text style={styles.headerSubtitle}>
            {isTracking ? 'Sharing Location' : 'Location Sharing Stopped'}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {error ? (
          <View style={styles.centerContent}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={requestLocationPermission}
            >
              <Text style={styles.retryButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.mapContainer}>
              {!isMapReady && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0047AB" />
                  <Text style={styles.loadingText}>Loading map...</Text>
                </View>
              )}
              {region && (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  region={region}
                  onMapReady={handleMapReady}
                  rotateEnabled={false}
                  loadingEnabled={true}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                  moveOnMarkerPress={false}
                  initialRegion={region}
                >
                  <UrlTile 
                    urlTemplate="http://tile.stamen.com/toner/{z}/{x}/{y}.png"
                    maximumZ={19}
                    flipY={false}
                    zIndex={-1}
                  />
                  {currentLocation && (
                    <Marker
                      coordinate={{
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                      }}
                      title={`Bus ${busNumber}`}
                      description="Current Location"
                      zIndex={1}
                    >
                      <View style={styles.customMarker}>
                        <Text style={styles.markerEmoji}>🚌</Text>
                      </View>
                    </Marker>
                  )}
                </MapView>
              )}
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.trackingButton,
                  isTracking ? styles.stopButton : styles.startButton,
                ]}
                onPress={isTracking ? stopLocationTracking : startLocationTracking}
              >
                <Text style={styles.trackingButtonText}>
                  {isTracking ? 'Stop Sharing Location' : 'Start Sharing Location'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    marginTop: 100, // Space for floating header
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonContent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  map: {
    flex: 1,
  },
  customMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 2,
    borderColor: '#0047AB',
  },
  markerEmoji: {
    fontSize: 24,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  trackingButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#0047AB',
  },
  stopButton: {
    backgroundColor: '#dc2626',
  },
  trackingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#0047AB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
}); 