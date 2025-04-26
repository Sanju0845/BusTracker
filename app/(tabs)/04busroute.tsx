import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Platform, Image, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/ThemeContext';

interface RouteStop {
  stop_name: string;
  arrival_time: string;
  departure_time: string;
  latitude: number;
  longitude: number;
  stop_order: number;
}

interface BusRoute {
  id: number;
  bus_number: string;
  stops: RouteStop[];
}

const TimeBlock = ({ label, time, theme, isDarkMode }: { label: string; time: string; theme: any; isDarkMode: boolean }) => (
  <View style={[styles.timeBlock, { 
    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.BORDER,
  }]}>
    <View style={[styles.timeIconContainer, {
      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
    }]}>
      <Ionicons 
        name={label === 'Arrival' ? 'time-outline' : 'exit-outline'} 
        size={14} 
        color={isDarkMode ? '#FFD700' : theme.PRIMARY} 
      />
    </View>
    <View style={styles.timeTextContainer}>
      <Text style={[styles.timeLabel, { color: theme.TEXT_SECONDARY }]}>{label}</Text>
      <Text style={[styles.stopTime, { color: theme.TEXT }]}>{time}</Text>
    </View>
  </View>
);

export default function BusRouteScreen() {
  const router = useRouter();
  const { busId, busNumber } = useLocalSearchParams();
  const [routeDetails, setRouteDetails] = useState<BusRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const expandAnimation = new Animated.Value(0);
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState({ latitude: 0, longitude: 0 });
  const [zoomLevel, setZoomLevel] = useState(13);
  const { theme, isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    fetchRouteDetails();
  }, [busId]);

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-';
    try {
      const timeWithoutSeconds = timeStr.split(':').slice(0, 2).join(':');
      const [hours, minutes] = timeWithoutSeconds.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (e) {
      console.error('Time formatting error:', e);
      return timeStr || '-';
    }
  };

  const fetchRouteDetails = async () => {
    try {
      console.log('Fetching route details for bus:', busNumber);
      
      const { data, error } = await supabase
        .from('bus_routes_view')
        .select('stop_name, arrival_time, departure_time, latitude, longitude, stop_order')
        .eq('bus_number', busNumber)
        .order('stop_order');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const stops = data.map(stop => ({
          stop_name: stop.stop_name,
            arrival_time: formatTime(stop.arrival_time),
            departure_time: stop.stop_name === 'KMCE College' ? '-' : formatTime(stop.departure_time),
          latitude: stop.latitude,
          longitude: stop.longitude,
          stop_order: stop.stop_order
        }));

        setRouteDetails({
          id: parseInt(busId as string),
          bus_number: busNumber as string,
          stops: stops
        });

        // Fit map to show all stops
        if (mapRef.current && stops.length > 0) {
          const coordinates = stops.map(stop => ({
            latitude: stop.latitude,
            longitude: stop.longitude,
          }));
          
          mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error('Error in fetchRouteDetails:', error);
      Alert.alert('Error', 'Failed to load route details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    Animated.timing(expandAnimation, {
      toValue: expanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const handleTrackBus = () => {
    router.push({
      pathname: '/(tabs)/02driverlocation',
      params: { busNumber }
    });
  };

  const fetchBusStops = async () => {
    try {
      console.log('Fetching bus stops for bus:', busNumber);
      const { data, error } = await supabase
        .from('bus_routes_view')
        .select('stop_name, latitude, longitude, stop_order, arrival_time, departure_time')
        .eq('bus_number', busNumber)
        .order('stop_order');

      if (error) {
        throw error;
      }

      if (data) {
        // Transform the data to match our BusStop interface
        const formattedStops = data.map(stop => ({
          id: stop.stop_order,
          stop_name: stop.stop_name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          stop_order: stop.stop_order,
          arrival_time: formatTime(stop.arrival_time),
          departure_time: stop.stop_name === 'KMCE College' ? '-' : formatTime(stop.departure_time)
        }));
        setRouteDetails({
          id: parseInt(busId as string),
          bus_number: busNumber as string,
          stops: formattedStops
        });
        console.log('Fetched bus stops:', formattedStops);

        // If we have stops, center the map on the first stop
        if (formattedStops.length > 0) {
          setLocation({
            latitude: formattedStops[0].latitude,
            longitude: formattedStops[0].longitude
          });
          setZoomLevel(13); // Set a zoom level that shows the route better
        }
      }
    } catch (err) {
      console.error('Error fetching bus stops:', err);
      Alert.alert('Error', 'Failed to load bus stops');
    }
  };

  const renderStopInfo = () => {
    if (!routeDetails || !routeDetails.stops) return;

    const stops = routeDetails.stops;
    const coordinates = stops.map(stop => ({
      latitude: stop.latitude,
      longitude: stop.longitude,
    }));

    // Fit map to show all stops
    if (mapRef.current && coordinates.length > 0) {
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[theme.BACKGROUND_START, theme.BACKGROUND_END]}
        style={[styles.container, styles.centerContent]}
      >
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={[styles.loadingText, { color: theme.TEXT_SECONDARY }]}>Loading route details...</Text>
      </LinearGradient>
    );
  }

  if (!routeDetails || !routeDetails.stops || routeDetails.stops.length === 0) {
    return (
      <LinearGradient
        colors={[theme.BACKGROUND_START, theme.BACKGROUND_END]}
        style={[styles.container, styles.centerContent]}
      >
        <Text style={[styles.errorText, { color: theme.TEXT }]}>No route information available</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.PRIMARY }]}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const firstStop = routeDetails.stops[0];
  const lastStop = routeDetails.stops[routeDetails.stops.length - 1];
  const intermediateStops = routeDetails.stops.slice(1, -1);

  const region = {
    latitude: firstStop.latitude,
    longitude: firstStop.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const handleMapReady = (event: any) => {
    // Handle map ready event
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
          <Text style={[styles.headerTitle, { color: theme.TEXT }]}>Route Details</Text>
          <Text style={[styles.headerSubtitle, { color: theme.TEXT_SECONDARY }]}>Bus {busNumber}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.routeOverview, { 
          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.CARD_BACKGROUND,
          borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.BORDER,
          borderWidth: 1,
        }]}>
          <View style={styles.routeEndpoints}>
            <View style={styles.endpoint}>
              <View style={[styles.timelineDot, styles.startDot]} />
              <View style={styles.endpointInfo}>
                <Text style={[styles.endpointTitle, { color: theme.TEXT_SECONDARY }]}>Start</Text>
                <Text style={[styles.stopName, { color: theme.TEXT }]}>{firstStop.stop_name}</Text>
                <View style={styles.timeContainer}>
                  <TimeBlock label="Arrival" time={firstStop.arrival_time} theme={theme} isDarkMode={isDarkMode} />
                  <TimeBlock label="Departure" time={firstStop.departure_time} theme={theme} isDarkMode={isDarkMode} />
                </View>
              </View>
            </View>

            {intermediateStops.length > 0 && (
              <View style={[styles.routeLine, { borderLeftColor: isDarkMode ? '#FFD700' : theme.PRIMARY }]}>
                <TouchableOpacity 
                  style={[styles.expandButton, { 
                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                  }]}
                  onPress={toggleExpand}
                >
                  <Text style={[styles.expandButtonText, { color: theme.TEXT_SECONDARY }]}>
                    {expanded ? 'Show Less' : `${intermediateStops.length} Stops`}
                  </Text>
                  <Ionicons 
                    name={expanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color={theme.TEXT_SECONDARY} 
                  />
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.expandedStops}>
                    {intermediateStops.map((stop, index) => (
                      <View key={index} style={styles.intermediateStop}>
                        <View style={styles.timelineDot} />
                        <View style={styles.stopInfo}>
                          <Text style={[styles.stopName, { color: theme.TEXT }]}>{stop.stop_name}</Text>
                          <View style={styles.timeContainer}>
                            <TimeBlock label="Arrival" time={stop.arrival_time} theme={theme} isDarkMode={isDarkMode} />
                            <TimeBlock label="Departure" time={stop.departure_time} theme={theme} isDarkMode={isDarkMode} />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={styles.endpoint}>
              <View style={[styles.timelineDot, styles.endDot]} />
              <View style={styles.endpointInfo}>
                <Text style={[styles.endpointTitle, { color: theme.TEXT_SECONDARY }]}>End</Text>
                <Text style={[styles.stopName, { color: theme.TEXT }]}>KMCE College</Text>
                <View style={styles.timeContainer}>
                  <TimeBlock label="Arrival" time={lastStop.arrival_time} theme={theme} isDarkMode={isDarkMode} />
                  <TimeBlock label="Departure" time="-" theme={theme} isDarkMode={isDarkMode} />
                </View>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.trackButton, { backgroundColor: theme.PRIMARY }]}
          onPress={handleTrackBus}
        >
          <Ionicons name="map" size={20} color="#fff" />
          <Text style={styles.trackButtonText}>Track Live Location</Text>
        </TouchableOpacity>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.fullMap}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: routeDetails.stops[0].latitude,
              longitude: routeDetails.stops[0].longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            {routeDetails.stops.map((stop, index) => (
              <Marker
                key={`${stop.stop_name}-${index}`}
                coordinate={{
                  latitude: stop.latitude,
                  longitude: stop.longitude,
                }}
                title={stop.stop_name}
                description={`Arrival: ${stop.arrival_time}`}
              >
                <View style={[
                  styles.stopMarker,
                  index === 0 ? styles.startMarker : 
                  index === routeDetails.stops.length - 1 ? styles.endMarker : 
                  styles.intermediateMarker
                ]}>
                  <Text style={styles.stopMarkerText}>{index + 1}</Text>
                </View>
              </Marker>
            ))}
            
            <Polyline
              coordinates={routeDetails.stops.map(stop => ({
                latitude: stop.latitude,
                longitude: stop.longitude,
              }))}
              strokeColor={isDarkMode ? '#FFD700' : theme.PRIMARY}
              strokeWidth={3}
            />
          </MapView>
        </View>
      </ScrollView>
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
    marginTop: Platform.OS === 'ios' ? 90 : 106,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 56,
    paddingBottom: 12,
    height: Platform.OS === 'ios' ? 100 : 116,
    zIndex: 100,
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  routeOverview: {
    padding: 12,
    borderRadius: 14,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeEndpoints: {
    marginBottom: 6,
  },
  endpoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  endpointInfo: {
    marginLeft: 10,
    flex: 1,
  },
  endpointTitle: {
    fontSize: 11,
    marginBottom: 2,
    fontWeight: '500',
  },
  stopName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  routeLine: {
    marginLeft: 5,
    borderLeftWidth: 2,
    paddingLeft: 16,
    marginVertical: 4,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  expandButtonText: {
    marginRight: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  expandedStops: {
    marginTop: 12,
  },
  intermediateStop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
    marginTop: 4,
  },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34a853',
    marginTop: 4,
  },
  endDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ea4335',
    marginTop: 4,
  },
  stopInfo: {
    marginLeft: 10,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  timeBlock: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  timeTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  stopTime: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
    padding: 14,
    borderRadius: 10,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  fullMap: {
    ...StyleSheet.absoluteFillObject,
  },
  stopMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  startMarker: {
    backgroundColor: '#4CAF50',
  },
  endMarker: {
    backgroundColor: '#f44336',
  },
  intermediateMarker: {
    backgroundColor: '#2196F3',
  },
  stopMarkerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 10,
    fontWeight: '500',
  },
}); 