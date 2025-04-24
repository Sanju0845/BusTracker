import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface RouteStop {
  stop_name: string;
  arrival_time: string;
  departure_time: string;
  latitude: number;
  longitude: number;
}

interface BusRoute {
  id: number;
  bus_number: string;
  stops: RouteStop[];
}

export default function BusRouteScreen() {
  const router = useRouter();
  const { busId, busNumber } = useLocalSearchParams();
  const [routeDetails, setRouteDetails] = useState<BusRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const expandAnimation = new Animated.Value(0);

  useEffect(() => {
    fetchRouteDetails();
  }, [busId]);

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

      console.log('Raw Supabase data:', JSON.stringify(data, null, 2));

      if (data && data.length > 0) {
        const stops = data.map(stop => {
          // Format time from "HH:MM:SS" or "HH:MM" to "HH:MM AM/PM"
          const formatTime = (timeStr: string | null) => {
            if (!timeStr) return '-';
            try {
              // Remove seconds if present
              const timeWithoutSeconds = timeStr.split(':').slice(0, 2).join(':');
              const [hours, minutes] = timeWithoutSeconds.split(':');
              const hour = parseInt(hours);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const hour12 = hour % 12 || 12;
              return `${hour12}:${minutes} ${ampm}`;
            } catch (e) {
              console.error('Time formatting error for time:', timeStr, e);
              return timeStr || '-'; // Return original time if formatting fails
            }
          };

          return {
          stop_name: stop.stop_name,
            arrival_time: formatTime(stop.arrival_time),
            departure_time: stop.stop_name === 'KMCE College' ? '-' : formatTime(stop.departure_time),
          latitude: stop.latitude,
          longitude: stop.longitude
          };
        });

        setRouteDetails({
          id: parseInt(busId as string),
          bus_number: busNumber as string,
          stops: stops
        });
      } else {
        console.log('No data returned from Supabase');
      }
    } catch (error) {
      console.error('Error in fetchRouteDetails:', error);
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
      pathname: '/(tabs)/bustracking',
      params: { busNumber }
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (!routeDetails || !routeDetails.stops || routeDetails.stops.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>No route information available</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const firstStop = routeDetails.stops[0];
  const lastStop = routeDetails.stops[routeDetails.stops.length - 1];
  const intermediateStops = routeDetails.stops.slice(1, -1);

  return (
    <View style={styles.container}>
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
          <Text style={styles.headerTitle}>Route Details</Text>
          <Text style={styles.headerSubtitle}>Bus {busNumber}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.routeOverview}>
          <View style={styles.routeEndpoints}>
            <View style={styles.endpoint}>
              <View style={[styles.timelineDot, styles.startDot]} />
              <View style={styles.endpointInfo}>
                <Text style={styles.endpointTitle}>Start</Text>
                <Text style={styles.stopName}>{firstStop.stop_name}</Text>
                <View style={styles.timeContainer}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Arrival</Text>
                    <Text style={styles.stopTime}>{firstStop.arrival_time}</Text>
                  </View>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Departure</Text>
                    <Text style={styles.stopTime}>{firstStop.departure_time}</Text>
                  </View>
                </View>
              </View>
            </View>

            {intermediateStops.length > 0 && (
              <View style={styles.routeLine}>
                <TouchableOpacity 
                  style={styles.expandButton}
                  onPress={toggleExpand}
                >
                  <Text style={styles.expandButtonText}>
                    {expanded ? 'Show Less' : `${intermediateStops.length} Stops`}
                  </Text>
                  <Ionicons 
                    name={expanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.expandedStops}>
                    {intermediateStops.map((stop, index) => (
                      <View key={index} style={styles.intermediateStop}>
                        <View style={styles.timelineDot} />
            <View style={styles.stopInfo}>
              <Text style={styles.stopName}>{stop.stop_name}</Text>
                          <View style={styles.timeContainer}>
                            <View style={styles.timeBlock}>
                              <Text style={styles.timeLabel}>Arrival</Text>
                              <Text style={styles.stopTime}>{stop.arrival_time}</Text>
                            </View>
                            <View style={styles.timeBlock}>
                              <Text style={styles.timeLabel}>Departure</Text>
                              <Text style={styles.stopTime}>{stop.departure_time}</Text>
                            </View>
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
                <Text style={styles.endpointTitle}>End</Text>
                <Text style={styles.stopName}>KMCE College</Text>
                <View style={styles.timeContainer}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Arrival</Text>
                    <Text style={styles.stopTime}>{lastStop.arrival_time}</Text>
                  </View>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Departure</Text>
                    <Text style={styles.stopTime}>-</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

              <TouchableOpacity 
                style={styles.trackButton}
                onPress={handleTrackBus}
              >
          <Ionicons name="map" size={20} color="#fff" />
          <Text style={styles.trackButtonText}>Track Live Location</Text>
              </TouchableOpacity>
      </ScrollView>
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
  routeOverview: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 16,
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
    marginBottom: 16,
  },
  endpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  endpointInfo: {
    marginLeft: 12,
  },
  endpointTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  routeLine: {
    marginLeft: 5,
    borderLeftWidth: 2,
    borderLeftColor: '#FFD700',
    paddingLeft: 20,
    marginVertical: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  expandButtonText: {
    color: '#666',
    marginRight: 4,
    fontSize: 14,
  },
  expandedStops: {
    marginTop: 12,
  },
  intermediateStop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
  },
  startDot: {
    backgroundColor: '#34a853',
  },
  endDot: {
    backgroundColor: '#ea4335',
  },
  stopInfo: {
    marginLeft: 12,
    flex: 1,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timeContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 16,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  stopTime: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 