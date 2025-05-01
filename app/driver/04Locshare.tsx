import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity, Alert, Linking, Vibration } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import type { LocationObject } from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
import { useTheme } from '../../lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';
import { useTheme as useThemeContext } from '../../lib/ThemeContext';

interface LocationData {
  latitude: number;
  longitude: number;
}

interface BusStop {
  id: number;
  stop_name: string;
  latitude: number;
  longitude: number;
  arrival_time: string;
  is_completed: boolean;
  status?: 'approaching' | 'arrived' | 'departed';
}

const HYDERABAD_COORDS = {
  latitude: 17.3850,
  longitude: 78.4867
};

const EMERGENCY_CONTACT = 'King';

export default function LocationShareScreen() {
  const { busNumber } = useLocalSearchParams();
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(false);
  const [location, setLocation] = useState<LocationData>(HYDERABAD_COORDS);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const webViewRef = useRef<WebView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const retryAttempts = useRef(0);
  const MAX_RETRY_ATTEMPTS = 3;
  const [hasSOSAlert, setHasSOSAlert] = useState(false);
  const [sound, setSound] = useState<Audio.Sound>();

  useEffect(() => {
    // Check if busNumber is available
    if (!busNumber) {
      Alert.alert(
        'Bus Number Required',
        'Please select a bus first',
        [
          {
            text: 'Select Bus',
            onPress: () => router.push('/driver/01driverselectbus')
          }
        ]
      );
      return;
    }

    checkLocationPermission();
    fetchBusStops();
    setupNotifications();
    
    // Set up SOS alert listener
    const sosSubscription = supabase
      .channel('sos_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_alerts',
          filter: `bus_number=eq.${busNumber}`
        },
        (payload) => {
          handleSOSAlert(payload.new);
        }
      )
      .subscribe();

    // Add proximity check interval
    const proximityCheckInterval = setInterval(() => {
      if (location && busStops.length > 0) {
        checkProximityToStops();
      }
    }, 5000); // Check every 5 seconds

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      sosSubscription.unsubscribe();
      if (sound) {
        sound.unloadAsync();
      }
      clearInterval(proximityCheckInterval);
    };
  }, [busNumber, location, busStops]);

  const fetchBusStops = async () => {
    try {
      const { data, error } = await supabase
        .from('bus_routes')
        .select(`
          stop_name,
          latitude,
          longitude,
          stop_order,
          arrival_time,
          departure_time,
          status
        `)
        .eq('bus_number', busNumber)
        .order('stop_order');

      if (error) {
        throw error;
      }

      if (data) {
        setBusStops(data.map(stop => ({
          ...stop,
          id: stop.stop_order,
          is_completed: stop.status === 'departed'
        })));
        
        // Update the map with stops
        if (webViewRef.current) {
          const script = `
            if (typeof map !== 'undefined') {
              // Clear existing markers
              if (window.stopMarkers) {
                window.stopMarkers.forEach(marker => marker.remove());
              }
              window.stopMarkers = [];

              // Add stop markers
              const stops = ${JSON.stringify(data)};
              const bounds = new L.LatLngBounds();

              stops.forEach((stop, index) => {
                const marker = L.marker([stop.latitude, stop.longitude], {
                  icon: L.divIcon({
                    className: 'stop-marker',
                    html: '<div style="background-color: ' + 
                      (stop.status === 'departed' ? '#4CAF50' : 
                       stop.status === 'arrived' ? '#FFC107' : 
                       stop.status === 'approaching' ? '#2196F3' : '#ff4444') + 
                      '; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">' + 
                      (index + 1) + '</div>'
                  })
                }).addTo(map);
                
                marker.bindPopup(
                  '<b>' + stop.stop_name + '</b><br>' +
                  'Arrival: ' + stop.arrival_time + '<br>' +
                  'Status: ' + (stop.status || 'Pending')
                );
                
                window.stopMarkers.push(marker);
                bounds.extend([stop.latitude, stop.longitude]);
              });

              // Draw route line between stops
              const coordinates = stops.map(stop => [stop.latitude, stop.longitude]);
              if (window.routeLine) {
                window.routeLine.remove();
              }
              window.routeLine = L.polyline(coordinates, {
                color: '#4CAF50',
                weight: 3,
                opacity: 0.8
              }).addTo(map);

              // Fit map to show all stops with padding
              map.fitBounds(bounds, { padding: [50, 50] });
            }
          `;
          webViewRef.current.injectJavaScript(script);
        }
      }
    } catch (err) {
      console.error('Error fetching bus stops:', err);
      Alert.alert('Error', 'Failed to load bus stops');
    }
  };

  const checkLocationPermission = async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to use this feature',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location Required',
          'Please enable background location for better tracking',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }

      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error checking location permission:', err);
      return false;
    }
  };

  const startLocationTracking = async () => {
    try {
      // First check if location services are enabled
      const hasServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!hasServicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Check foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please grant location permission to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Check background permissions
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location Required',
          'Please grant background location permission for continuous tracking.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Get initial location
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      if (!initialLocation) {
        throw new Error('Failed to get initial location');
      }

      // Update initial location
      handleLocationUpdate(initialLocation);

      // Start continuous location tracking
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10, // Update every 10 meters
          timeInterval: 5000, // Update every 5 seconds
        },
        (newLocation) => {
          console.log('New location update:', newLocation);
          handleLocationUpdate(newLocation);
        }
      );

      setIsSharing(true);
      setError(null);

      // Show success message
      Alert.alert(
        'Location Sharing Started',
        'Your location is now being shared with the system.',
        [{ text: 'OK' }]
      );

    } catch (err) {
      console.error('Error starting location tracking:', err);
      setError('Failed to start location tracking');
      
      Alert.alert(
        'Error',
        'Failed to start location tracking. Please check your location settings and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
    }
  };

  const stopLocationTracking = async () => {
    try {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      setLocation(HYDERABAD_COORDS);
      setZoomLevel(15);
      setIsSharing(false);
    } catch (err) {
      console.error('Error stopping location tracking:', err);
    }
  };

  const updateLocationInDatabase = async (location: LocationObject) => {
    try {
      const { data, error } = await supabase
        .from('bus_locations')
        .upsert({
          bus_number: busNumber,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          last_updated: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const handleLocationUpdate = (location: LocationObject) => {
    if (!location) return;
    
    // Update local state
    setLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    });
    
    // Update location in database
    updateLocationInDatabase(location);
    
    // Update map view without zooming
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (typeof window.updateBusLocation === 'function') {
          window.updateBusLocation(${location.coords.latitude}, ${location.coords.longitude});
        }
      `);
    }
  };

  const focusOnCurrentLocation = async () => {
    try {
      // First check if location services are enabled
      const hasServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!hasServicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Check foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please grant location permission to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Check background permissions
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location Required',
          'Please grant background location permission for continuous tracking.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      console.log("Getting current position...");
      
      // Use balanced accuracy for better compatibility
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10 // Update every 10 meters
      });

      if (!currentLocation) {
        throw new Error('Failed to get current location');
      }

      const newLocation = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      
      console.log("New location received:", newLocation);
      setLocation(newLocation);
      setZoomLevel(18);

      // Update the map with new location
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          if (typeof map !== 'undefined') {
            map.setView([${newLocation.latitude}, ${newLocation.longitude}], ${zoomLevel});
            if (window.busMarker) {
              window.busMarker.setLatLng([${newLocation.latitude}, ${newLocation.longitude}]);
            }
          }
        `);
      }

      retryAttempts.current = 0; // Reset retry counter on success

    } catch (err) {
      console.error('Error focusing on current location:', err);
      
      if (retryAttempts.current < MAX_RETRY_ATTEMPTS) {
        retryAttempts.current += 1;
        console.log(`Retry attempt ${retryAttempts.current} of ${MAX_RETRY_ATTEMPTS}`);
        
        Alert.alert(
          'Location Unavailable',
          'Retrying to get your location...',
          [{ text: 'OK' }]
        );

        // Retry after a delay
        setTimeout(() => {
          console.log("Retrying location fetch...");
          focusOnCurrentLocation();
        }, 2000); // Increased delay to 2 seconds
      } else {
        Alert.alert(
          'Location Error',
          'Could not get your location after multiple attempts. Please check your GPS settings and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        retryAttempts.current = 0;
      }
    }
  };

  const getMapUrl = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            body, html { margin: 0; padding: 0; height: 100%; }
            #map { height: 100%; width: 100%; }
            .stop-marker {
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              color: white;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map', {
              zoomControl: false,
              minZoom: 10,
              maxZoom: 18
            }).setView([17.3850, 78.4867], 15);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            window.stopMarkers = [];
            window.routeLine = null;

            // Prevent automatic zooming
            window.preventAutoZoom = true;
            map.on('zoomend', () => {
              if (!window.preventAutoZoom) {
                window.preventAutoZoom = true;
              }
            });

            // Function to update bus location without zooming
            window.updateBusLocation = function(lat, lng) {
              if (window.busMarker) {
                window.busMarker.setLatLng([lat, lng]);
              } else {
                window.busMarker = L.marker([lat, lng], {
                  icon: L.divIcon({
                    className: 'bus-marker',
                    html: '<div style="background-color: #2196F3; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10z"/></svg></div>'
                  })
                }).addTo(map);
              }
            };
          </script>
        </body>
      </html>
    `;
  };

  const renderStopInfo = () => {
    if (!webViewRef.current || !busStops.length) return;

    const script = `
      if (typeof map !== 'undefined') {
        // Clear existing markers
        if (window.stopMarkers) {
          window.stopMarkers.forEach(marker => marker.remove());
        }
        window.stopMarkers = [];

        // Add stop markers
      const stops = ${JSON.stringify(busStops)};
        const bounds = new L.LatLngBounds();
      
        stops.forEach((stop, index) => {
        const marker = L.marker([stop.latitude, stop.longitude], {
          icon: L.divIcon({
              className: 'stop-marker',
              html: '<div style="background-color: ' + 
                (stop.status === 'departed' ? '#4CAF50' : 
                 stop.status === 'arrived' ? '#FFC107' : 
                 stop.status === 'approaching' ? '#2196F3' : '#ff4444') + 
                '; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">' + 
                (index + 1) + '</div>'
          })
        }).addTo(map);
        
        marker.bindPopup(
            '<b>' + stop.stop_name + '</b><br>' +
          'Arrival: ' + stop.arrival_time + '<br>' +
          'Status: ' + (stop.status || 'Pending')
        );
        
          window.stopMarkers.push(marker);
          bounds.extend([stop.latitude, stop.longitude]);
        });

        // Draw route line between stops
        const coordinates = stops.map(stop => [stop.latitude, stop.longitude]);
        if (window.routeLine) {
          window.routeLine.remove();
        }
        window.routeLine = L.polyline(coordinates, {
          color: '#4CAF50',
          weight: 3,
          opacity: 0.8
        }).addTo(map);

        // Only fit bounds if no manual zoom has occurred
        if (window.preventAutoZoom) {
          map.fitBounds(bounds, { 
            padding: [50, 50],
            maxZoom: 15 // Prevent zooming in too far
          });
          window.preventAutoZoom = false;
        }
      }
    `;
    
    webViewRef.current.injectJavaScript(script);
  };

  const setupNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (err) {
      console.error('Error setting up notifications:', err);
    }
  };

  const playAlertSound = async () => {
    try {
      const { sound: alertSound } = await Audio.Sound.createAsync(
        require('../../assets/alert.mp3')
      );
      setSound(alertSound);
      await alertSound.playAsync();
    } catch (err) {
      console.error('Error playing alert sound:', err);
    }
  };

  const handleSOSAlert = async (sosData: any) => {
    try {
      // Vibrate the device
      Vibration.vibrate([1000, 2000, 1000], true);

      // Play alert sound
      await playAlertSound();

      // Show system notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ EMERGENCY SOS ALERT ⚠️',
          body: 'A student has requested emergency assistance!',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
      });

      // Show popup alert
      Alert.alert(
        '⚠️ EMERGENCY SOS ALERT ⚠️',
        'A student has requested emergency assistance!\n\nPlease take immediate action:',
        [
          {
            text: 'Stop Bus',
            onPress: async () => {
              try {
                await supabase
                  .from('sos_alerts')
                  .update({ 
                    status: 'acknowledged', 
                    action_taken: 'stop_requested',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sosData.id);
                
                // Stop vibration
                Vibration.cancel();
                
                Alert.alert(
                  'Action Taken',
                  'Bus stop request acknowledged. Please stop at a safe location.',
                  [{ text: 'OK' }]
                );
              } catch (err) {
                console.error('Error updating SOS alert:', err);
              }
              setHasSOSAlert(false);
            },
            style: 'destructive'
          },
          {
            text: 'Call Admin',
            onPress: () => {
              Linking.openURL(`tel:${EMERGENCY_CONTACT}`);
            }
          },
          {
            text: 'Dismiss',
            onPress: async () => {
              try {
                await supabase
                  .from('sos_alerts')
                  .update({ 
                    status: 'dismissed',
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', sosData.id);
                
                // Stop vibration
                Vibration.cancel();
              } catch (err) {
                console.error('Error dismissing SOS alert:', err);
              }
              setHasSOSAlert(false);
            },
            style: 'cancel'
          }
        ],
        { cancelable: false }
      );

      setHasSOSAlert(true);
    } catch (err) {
      console.error('Error handling SOS alert:', err);
    }
  };

  const checkProximityToStops = async () => {
    if (!location || !busStops.length) return;

    const PROXIMITY_THRESHOLD = 1000; // 1km in meters

    for (const stop of busStops) {
      if (stop.is_completed) continue;

      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        stop.latitude,
        stop.longitude
      );

      if (distance <= PROXIMITY_THRESHOLD) {
        // Update stop status in database
        await updateStopStatus(stop.id, 'approaching');
        
        // Show notification to driver
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Approaching Stop',
            body: `You are approaching ${stop.stop_name}`,
            sound: true,
          },
          trigger: null,
        });
      }
    }
  };

  const updateStopStatus = async (stopId: number, newStatus: 'approaching' | 'arrived' | 'departed') => {
    try {
      const { error } = await supabase
        .from('bus_routes')
        .update({ 
          status: newStatus,
          ...(newStatus === 'arrived' ? { arrival_time: new Date().toLocaleTimeString() } : {}),
          ...(newStatus === 'departed' ? { departure_time: new Date().toLocaleTimeString() } : {})
        })
        .eq('bus_number', busNumber)
        .eq('stop_order', stopId);

      if (error) throw error;

      // Update local state
      setBusStops(prevStops => 
        prevStops.map(stop => 
          stop.id === stopId 
            ? { 
                ...stop, 
                status: newStatus,
                is_completed: newStatus === 'departed'
              } 
            : stop
        )
      );

      // Show notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Stop ${newStatus}`,
          body: `Bus has ${newStatus} at stop ${stopId}`,
          sound: true,
        },
        trigger: null,
      });

      // Refresh map markers
      fetchBusStops();

    } catch (err) {
      console.error('Error updating stop status:', err);
      Alert.alert('Error', 'Failed to update stop status');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance * 1000; // Convert to meters
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };

  useEffect(() => {
    if (busNumber) {
      fetchBusStops();
    }
  }, [busNumber]);

  useEffect(() => {
    if (busStops.length > 0 && webViewRef.current) {
      renderStopInfo();
    }
  }, [busStops, webViewRef.current]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: getMapUrl() }}
          style={styles.webview}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('WebView error: ', nativeEvent);
          }}
          onLoad={() => {
            if (busStops.length > 0) {
              renderStopInfo();
            }
          }}
        />
        <TouchableOpacity 
          style={[styles.focusButton, isSharing && styles.focusButtonActive]}
          onPress={focusOnCurrentLocation}
        >
          <Ionicons 
            name="locate" 
            size={24} 
            color="white"
          />
        </TouchableOpacity>
        
        {/* Custom Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity 
            style={styles.zoomButton}
            onPress={() => webViewRef.current?.injectJavaScript('map.zoomIn();')}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.zoomButton}
            onPress={() => webViewRef.current?.injectJavaScript('map.zoomOut();')}
          >
            <Ionicons name="remove" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {hasSOSAlert && (
          <View style={styles.sosIndicator}>
            <Ionicons name="warning" size={24} color="#FF3333" />
            <Text style={styles.sosIndicatorText}>SOS Alert Active</Text>
          </View>
        )}
      </View>
      <TouchableOpacity 
        style={[styles.button, isSharing ? styles.stopButton : styles.startButton]}
        onPress={isSharing ? stopLocationTracking : startLocationTracking}
      >
        <Text style={styles.buttonText}>
          {isSharing ? 'Stop Sharing Location' : 'Start Sharing Location'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  focusButton: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    backgroundColor: '#2196F3',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  focusButtonActive: {
    backgroundColor: '#4CAF50',
  },
  button: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sosIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FFE5E5',
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sosIndicatorText: {
    color: '#FF3333',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    top: 80,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  zoomButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
}); 