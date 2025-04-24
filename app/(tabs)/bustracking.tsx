import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Set up notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Color scheme
const COLORS = {
  PRIMARY: '#2563EB',    // Modern blue
  SECONDARY: '#3B82F6',  // Lighter blue
  STOP: '#EF4444',       // Red for stops
  DESTINATION: '#10B981', // Green for college
  BUS: '#F59E0B',        // Amber for bus
  TEXT: '#1F2937',       // Dark gray for text
  BACKGROUND: 'rgba(255, 255, 255, 0.95)',
  CARD: '#FFFFFF',
  BORDER: '#E5E7EB',
};

interface RouteStop {
  id: number;
  stop_name: string;
  stop_order: number;
  latitude: number;
  longitude: number;
  scheduled_time: string;
  arrival_time: string;
  departure_time: string;
}

interface BusLocation {
  bus_number: string;
  latitude: number;
  longitude: number;
  last_updated: string;
}

export default function BusTrackingScreen() {
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStop, setCurrentStop] = useState(0);
  const [nextStop, setNextStop] = useState(1);
  const [eta, setEta] = useState('Calculating...');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef<MapView | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const [lastNotifiedStop, setLastNotifiedStop] = useState<number>(-1);
  const [busStatus, setBusStatus] = useState<string>('');
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Default region (Chaitanyapuri)
  const [region, setRegion] = useState({
    latitude: 17.3850,
    longitude: 78.4867,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const { busNumber } = useLocalSearchParams<{ busNumber: string }>();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!busNumber) {
      setError('No bus number provided');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchRouteDetails();
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load route details');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(() => {
      if (!loading && !error) {
        fetchBusLocation().catch(console.error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [busNumber]);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

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
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      } catch (err) {
        console.error('Error getting location:', err);
      }
    })();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus === 'granted') {
        setNotificationsEnabled(true);
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const sendNotification = async (title: string, body: string) => {
    try {
      if (notificationsEnabled) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 250, 250, 250],
            color: COLORS.PRIMARY,
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const sendNotificationWithCooldown = async (title: string, body: string) => {
    const now = Date.now();
    if (now - lastNotificationTime > 2 * 60 * 1000) {
      await sendNotification(title, body);
      setLastNotificationTime(now);
    }
  };

  const fetchRouteBetweenPoints = async (start: [number, number], end: [number, number]) => {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        return data.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
      }
      return [];
    } catch (err) {
      console.error('Error fetching route:', err);
      return [];
    }
  };

  const fetchCompleteRoute = async (stops: RouteStop[]) => {
    const allRouteSegments: any[] = [];
    
    for (let i = 0; i < stops.length - 1; i++) {
      const start: [number, number] = [stops[i].latitude, stops[i].longitude];
      const end: [number, number] = [stops[i + 1].latitude, stops[i + 1].longitude];
      
      const segment = await fetchRouteBetweenPoints(start, end);
      allRouteSegments.push(...segment);
    }
    
    setRouteCoordinates(allRouteSegments);
  };

  const fetchRouteDetails = async () => {
    try {
      const { data, error: routeError } = await supabase
        .from('bus_routes_view')
        .select('*')
        .eq('bus_number', busNumber)
        .order('stop_order');

      if (routeError) throw routeError;
      
      if (!data || data.length === 0) {
        setError('No route found for this bus');
        return;
      }

      setRouteStops(data);
      await fetchCompleteRoute(data);
      await fetchBusLocation();
    } catch (err) {
      console.error('Error fetching route details:', err);
      throw new Error('Failed to fetch route details');
    }
  };

  const fetchBusLocation = async () => {
    try {
      const { data, error } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('bus_number', busNumber)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching bus location:', error);
        return;
      }

      if (data) {
        setBusLocation(data);
        updateStopStatus(data.latitude, data.longitude);
      }
    } catch (err) {
      console.error('Error in fetchBusLocation:', err);
    }
  };

  const updateStopStatus = (lat: number, lng: number) => {
    let closestStopIndex = 0;
    let minDistance = Number.MAX_SAFE_INTEGER;

    routeStops.forEach((stop, index) => {
      const distance = Math.sqrt(
        Math.pow(stop.latitude - lat, 2) + Math.pow(stop.longitude - lng, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestStopIndex = index;
      }
    });

    const currentStopData = routeStops[closestStopIndex];
    const nextStopData = routeStops[closestStopIndex + 1];
    const distanceToStop = minDistance * 111;

    if (distanceToStop <= 0.2) {
      if (lastNotifiedStop !== closestStopIndex) {
        setBusStatus(`Arrived at ${currentStopData.stop_name}`);
        sendNotificationWithCooldown(
          `Bus ${busNumber} Arrived`,
          `Bus has arrived at ${currentStopData.stop_name}`
        );
        setLastNotifiedStop(closestStopIndex);
        Vibration.vibrate([500, 200, 500]);
      }
    } else if (distanceToStop > 1 && lastNotifiedStop === closestStopIndex) {
      setBusStatus(`Left ${currentStopData.stop_name}`);
      sendNotificationWithCooldown(
        `Bus ${busNumber} Departed`,
        `Bus has left ${currentStopData.stop_name}`
      );
      setLastNotifiedStop(-1);
      Vibration.vibrate(500);
    } else if (distanceToStop <= 1) {
      const etaMinutes = calculateETA(currentStopData, nextStopData);
      if (etaMinutes > 0) {
        setBusStatus(`Arriving at ${currentStopData.stop_name} in ${Math.round(distanceToStop * 1000)}m`);
        if (lastNotifiedStop !== closestStopIndex) {
          sendNotificationWithCooldown(
            `Bus ${busNumber} Approaching`,
            `Bus is arriving at ${currentStopData.stop_name} in ${etaMinutes} minutes (${Math.round(distanceToStop * 1000)}m away)`
          );
        }
      }
    } else {
      if (nextStopData) {
        const etaMinutes = calculateETA(currentStopData, nextStopData);
        if (etaMinutes > 0) {
          setBusStatus(`Next stop: ${nextStopData.stop_name} in ${etaMinutes} minutes`);
        }
      }
    }

    setCurrentStop(closestStopIndex);
    setNextStop(closestStopIndex + 1);
    updateEta(closestStopIndex);
  };

  const calculateETA = (currentStop: RouteStop, nextStop: RouteStop) => {
    try {
      if (!currentStop?.arrival_time || !nextStop?.arrival_time) {
        return 0;
      }

      const [currentHours, currentMinutes] = currentStop.arrival_time.split(':').map(Number);
      const [nextHours, nextMinutes] = nextStop.arrival_time.split(':').map(Number);
      
      if (isNaN(currentHours) || isNaN(currentMinutes) || isNaN(nextHours) || isNaN(nextMinutes)) {
        return 0;
      }

      const currentTime = currentHours * 60 + currentMinutes;
      const nextTime = nextHours * 60 + nextMinutes;
    
      return nextTime - currentTime;
    } catch (err) {
      console.error('Error calculating ETA:', err);
      return 0;
    }
  };

  const updateEta = (currentStopOrder: number) => {
    try {
      if (currentStopOrder >= routeStops.length - 1) {
        setEta('Arrived at destination');
        return;
      }

      const nextStop = routeStops[currentStopOrder + 1];
      if (!nextStop?.arrival_time) {
        setEta('Time not available');
        return;
      }

      const [hours, minutes] = nextStop.arrival_time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        setEta('Invalid time format');
        return;
      }

      const currentTime = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0);

      const timeDiff = scheduledTime.getTime() - currentTime.getTime();
      const minutesDiff = Math.floor(timeDiff / (1000 * 60));

      if (minutesDiff < 0) {
        setEta('Delayed');
      } else {
        setEta(`${minutesDiff} minutes`);
      }
    } catch (err) {
      console.error('Error updating ETA:', err);
      setEta('Time calculation error');
    }
  };

  const formatLastUpdated = (timestamp: string) => {
    try {
      if (!timestamp) return 'Not available';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid time';
      return date.toLocaleTimeString();
    } catch (err) {
      console.error('Error formatting last updated time:', err);
      return 'Time format error';
    }
  };

  const handleMapReady = () => {
    setIsMapReady(true);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      await fetchRouteDetails();
      await fetchBusLocation();
    } catch (err) {
      console.error('Error refreshing data:', err);
      Alert.alert('Refresh Failed', 'Could not refresh bus location. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      {/* Modern Floating Header */}
      <View style={styles.floatingHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <View style={styles.backButtonContent}>
            <Ionicons name="chevron-back" size={24} color={COLORS.TEXT} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Bus {busNumber}</Text>
          <Text style={styles.headerSubtitle}>Live Tracking</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          <View style={styles.backButtonContent}>
            <Ionicons 
              name="refresh" 
              size={24} 
              color={isRefreshing ? "#666" : COLORS.TEXT} 
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, { top: 110 }]}>
        <Text style={styles.statusText}>{busStatus || 'Updating...'}</Text>
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading route details...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : !loading && !error && routeStops.length > 0 ? (
        <View style={styles.mapContainer}>
          {!isMapReady && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
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
            {/* Route Line */}
            {routeCoordinates.length > 0 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={COLORS.PRIMARY}
                strokeWidth={4}
                lineDashPattern={[0]}
                zIndex={1}
              />
            )}
            
            {/* Bus Stops */}
            {routeStops.map((stop, index) => (
              <Marker
                key={`${stop.stop_name}-${index}`}
                coordinate={{
                  latitude: stop.latitude,
                  longitude: stop.longitude,
                }}
                title={stop.stop_name}
                description={`Arrival: ${stop.arrival_time || 'N/A'}`}
                zIndex={2}
              >
                {index === routeStops.length - 1 ? (
                  <View style={styles.destinationMarker}>
                    <MaterialIcons name="school" size={24} color={COLORS.DESTINATION} />
                    <View style={[styles.markerPin, { backgroundColor: COLORS.DESTINATION }]} />
                  </View>
                ) : (
                  <View style={styles.stopMarker}>
                    <MaterialIcons name="location-on" size={28} color={COLORS.STOP} />
                  </View>
                )}
              </Marker>
            ))}

            {/* Bus Location */}
            {busLocation && (
              <Marker
                coordinate={{
                  latitude: busLocation.latitude,
                  longitude: busLocation.longitude,
                }}
                title={`Bus ${busNumber}`}
                description={`Updated: ${formatLastUpdated(busLocation.last_updated)}`}
                zIndex={3}
              >
                <View style={styles.busMarker}>
                  <MaterialCommunityIcons name="bus" size={24} color={COLORS.BUS} />
                  <View style={[styles.busMarkerDot, { backgroundColor: COLORS.BUS }]} />
                </View>
              </Marker>
            )}
          </MapView>

          {/* Floating Legend */}
          <View style={[styles.floatingLegend, { backgroundColor: COLORS.BACKGROUND }]}>
            <View style={styles.legendItem}>
              <MaterialIcons name="location-on" size={20} color={COLORS.STOP} />
              <Text style={[styles.legendText, { color: COLORS.TEXT }]}>Stop</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <MaterialIcons name="school" size={20} color={COLORS.DESTINATION} />
              <Text style={[styles.legendText, { color: COLORS.TEXT }]}>College</Text>
            </View>
            <View style={styles.legendDivider} />
            <View style={styles.legendItem}>
              <MaterialCommunityIcons name="bus" size={20} color={COLORS.BUS} />
              <Text style={[styles.legendText, { color: COLORS.TEXT }]}>Bus</Text>
            </View>
          </View>

          {/* Floating ETA Card */}
          <View style={[styles.floatingEta, { backgroundColor: COLORS.PRIMARY }]}>
            <Ionicons name="time-outline" size={20} color="#fff" />
            <Text style={[styles.etaText, { color: '#fff' }]}>
              {nextStop < routeStops.length ? `ETA: ${eta}` : 'Journey Complete'}
            </Text>
          </View>

          {/* Expandable Route Details */}
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={toggleExpand}
          >
            <Ionicons 
              name={isExpanded ? "chevron-down" : "chevron-up"} 
              size={24} 
              color={COLORS.TEXT} 
            />
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.routeDetails}>
              <Text style={styles.routeDetailsTitle}>Route Details</Text>
              {routeStops.map((stop, index) => (
                <View key={index} style={styles.stopItem}>
                  <View style={styles.stopDot} />
                  <View style={styles.stopInfo}>
                    <Text style={styles.stopName}>{stop.stop_name}</Text>
                    <Text style={styles.stopTime}>
                      Arrival: {stop.arrival_time || 'N/A'} | Departure: {stop.departure_time || 'N/A'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: COLORS.BACKGROUND,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 45,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
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
    color: COLORS.TEXT,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  refreshButton: {
    marginLeft: 8,
  },
  statusCard: {
    position: 'absolute',
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 16,
    padding: 12,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: COLORS.TEXT,
    fontWeight: '500',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  marker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  destinationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    position: 'absolute',
    bottom: -4,
    width: 2,
    height: 8,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 1,
  },
  busMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  busMarkerDot: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 6,
    backgroundColor: COLORS.BUS,
    borderRadius: 3,
  },
  floatingLegend: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  legendText: {
    fontSize: 14,
    color: COLORS.TEXT,
  },
  floatingEta: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  etaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  expandButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeDetails: {
    position: 'absolute',
    top: 70,
    left: 16,
    right: 16,
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 16,
    padding: 16,
    maxHeight: Dimensions.get('window').height * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 16,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
    marginRight: 12,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  stopTime: {
    fontSize: 14,
    color: '#666',
  },
}); 