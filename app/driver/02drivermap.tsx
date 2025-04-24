import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import LogoutMenu from '../components/LogoutMenu';

interface LocationData {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
}

const DriverMapScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const busId = params.busId;
  
  const mapRef = useRef<MapView | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Update initial region
  const [region, setRegion] = useState({
    latitude: 17.3850,
    longitude: 78.4867,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // Location permission and tracking setup
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    const setupLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        // Get initial location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(currentLocation as LocationData);
        setRegion({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });

        // Subscribe to location updates
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (newLocation) => {
            setLocation(newLocation as LocationData);
            updateDriverLocation(newLocation as LocationData);
          }
        );
      } catch (err) {
        console.error('Error setting up location tracking:', err);
        setErrorMsg('Error setting up location tracking');
      }
    };

    setupLocation();

    // Cleanup subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [busId]);

  // Update driver location in database
  const updateDriverLocation = useCallback(async (newLocation: LocationData) => {
    if (!busId) {
      console.error('No bus number available for location update');
      setErrorMsg('Missing bus number - cannot update location');
      return;
    }

    try {
      console.log('Attempting to update location for bus:', busId);
      
      // Insert new location record
      const { error } = await supabase
        .from('bus_locations')
        .insert({
          bus_number: busId.toString(),
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
          last_updated: new Date().toISOString()
        });

      if (error) {
        console.error('Supabase error updating location:', error);
        setErrorMsg(`Failed to update location: ${error.message}`);
      } else {
        console.log('Successfully updated location for bus:', busId);
        setErrorMsg(null);
      }
    } catch (err) {
      console.error('Error updating location:', err);
      setErrorMsg('Failed to update bus location');
    }
  }, [busId]);

  const handleMapReady = () => {
    console.log('Map is ready');
    setIsMapReady(true);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        provider={PROVIDER_DEFAULT}
        onMapReady={handleMapReady}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={true}
        initialRegion={region}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title={`Bus ${busId}`}
            description="Current Location"
          />
        )}
      </MapView>

      {!isMapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

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
          <Text style={styles.headerTitle}>Bus {busId}</Text>
          <Text style={styles.headerSubtitle}>Live Location Tracking</Text>
        </View>
        <LogoutMenu />
      </View>

      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    padding: 5,
  },
  backButtonContent: {
    padding: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 20,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default DriverMapScreen; 