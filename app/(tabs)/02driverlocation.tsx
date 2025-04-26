import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, StatusBar, TouchableOpacity, Text, Alert, Linking, ActivityIndicator, ScrollView, Switch, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

interface DriverLocation {
  latitude: number;
  longitude: number;
  last_updated: string;
  speed?: number;
  accuracy?: number;
  heading?: number;
}

interface RouteStop {
  stop_name: string;
  latitude: number;
  longitude: number;
  stop_order: number;
  arrival_time: string;
  departure_time?: string;
  status?: 'approaching' | 'arrived' | 'departed';
}

interface BusInfo {
  bus_number: string;
  route_name: string;
  driver_name: string;
  driver_contact: string;
  total_stops: number;
  completed_stops: number;
  remaining_stops: number;
  status: 'On Time' | 'Delayed' | 'Early';
  next_stop?: {
    stop_name: string;
    arrival_time: string;
    estimated_time: string;
    distance: number | null;
    eta: number | null;
    weather?: {
      temperature: number;
      condition: string;
      icon: string;
    };
  };
  current_stop?: {
    stop_name: string;
    arrival_time: string;
    departure_time: string;
  };
}

const EMERGENCY_CONTACTS = [
  { name: 'Bus Control Room', number: '93949494848' },
  { name: 'College Security', number: '93949494849' },
  { name: 'Emergency Services', number: '108' }
];

const SOS_WHATSAPP_NUMBER = '7981076663';
const SOS_COUNTDOWN_SECONDS = 5;
const busNumber = 'ts01ep0000';
const EMERGENCY_PHONE_NUMBER = '9493562061';

const sendSOSLocation = async () => {
  try {
    // Request location permissions first
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'Please enable location services to send your location.',
        [
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    // Format the message with bus info and location
    const message = `🚨 SOS ALERT! 🚨\n\n` +
      `Bus Number: ${busNumber}\n` +
      `Current Location: https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}\n` +
      `Time: ${new Date().toLocaleTimeString()}\n` +
      `Please respond immediately!`;

    // Create WhatsApp URL with proper formatting
    const whatsappUrl = `whatsapp://send?phone=${SOS_WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}`;

    // Open WhatsApp
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      Alert.alert('Error', 'WhatsApp is not installed on this device');
    }
  } catch (error) {
    console.error('Error sending SOS:', error);
    Alert.alert('Error', 'Failed to send SOS. Please try again.');
  }
};

const calculateStatus = (arrivalTime: string, estimatedTime: string) => {
  const arrival = new Date(`1970-01-01T${arrivalTime}:00`);
  const estimated = new Date(`1970-01-01T${estimatedTime}:00`);

  const diff = (estimated.getTime() - arrival.getTime()) / 60000; // in minutes

  if (diff > 5) return 'Delayed';
  if (diff < -5) return 'Early';
  return 'On Time';
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
  return Math.round(distance * 1000); // Convert to meters
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI/180);
};

export default function DriverLocationScreen() {
  const { busNumber } = useLocalSearchParams();
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [busInfo, setBusInfo] = useState<BusInfo | null>(null);
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [isZoomedIn, setIsZoomedIn] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const driverMarkerRef = useRef<any>(null);
  const [showMapTypeOptions, setShowMapTypeOptions] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const router = useRouter();
  const [crossedStops, setCrossedStops] = useState<RouteStop[]>([]);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [passengerCount, setPassengerCount] = useState(0);
  const [showPassengerPopup, setShowPassengerPopup] = useState(true);

  useEffect(() => {
    // Request location permissions when component mounts
    const requestLocationPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services to track the bus location.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
            {
              text: 'Cancel',
              style: 'cancel',
            },
          ]
        );
      }
    };

    requestLocationPermission();

    // Set up real-time subscription for bus location
    const locationSubscription = supabase
      .channel('bus_locations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bus_locations',
          filter: `bus_number=eq.${busNumber}`
        },
        async (payload) => {
          if (payload.new) {
            const newLocation = payload.new as DriverLocation;
            setDriverLocation(newLocation);
            setLastUpdateTime(new Date().toLocaleTimeString());
            updateDriverMarker(newLocation);
            setIsLive(true);
            
            // Check distance and send notifications
            await checkDistanceAndNotify(newLocation);
          }
        }
      )
      .subscribe((status) => {
        console.log('Location subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
        } else {
          setIsLive(false);
        }
      });

    // Set up a heartbeat to check connection status
    const heartbeat = setInterval(() => {
      const now = new Date();
      const lastUpdate = lastUpdateTime ? new Date(lastUpdateTime) : null;
      
      if (lastUpdate && (now.getTime() - lastUpdate.getTime() > 10000)) { // 10 seconds
        setIsLive(false);
      }
    }, 5000);

    // Set up stop status subscription
    const stopStatusSubscription = supabase
      .channel('stop_status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'route_stops',
          filter: `bus_number=eq.${busNumber}`
        },
        (payload) => {
          console.log('Received stop status update:', payload);
          if (payload.new) {
            handleStopStatusUpdate(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('Stop status subscription status:', status);
      });

    // Initial fetch of data
    fetchBusInfo();
    fetchStops();

    return () => {
      locationSubscription.unsubscribe();
      stopStatusSubscription.unsubscribe();
      clearInterval(heartbeat);
    };
  }, [busNumber, lastUpdateTime]);

  useEffect(() => {
    if (driverLocation) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [driverLocation]);

  const updateDriverMarker = (newLocation: DriverLocation) => {
    if (!webViewRef.current) return;

    const script = `
      if (typeof map !== 'undefined') {
        // Create enhanced bus icon with direction indicator
        const busIcon = L.divIcon({
          className: 'bus-marker',
          html: '<div style="position: relative; width: 48px; height: 48px;">' +
                '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: #2196F3; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">' +
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>' +
                '</div>' +
                '<div style="position: absolute; top: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 12px solid #2196F3;"></div>' +
                '</div>'
        });

        // Create or update driver marker
        if (!window.driverMarker) {
          window.driverMarker = L.marker([${newLocation.latitude}, ${newLocation.longitude}], {
            icon: busIcon,
            rotationAngle: ${newLocation.heading || 0},
            rotationOrigin: 'center center'
          }).addTo(map);
          
          window.driverMarker.bindPopup(
            '<b>Bus Location</b><br>' +
            'Last updated: ${new Date(newLocation.last_updated).toLocaleTimeString()}<br>' +
            'Speed: ${newLocation.speed ? Math.round(newLocation.speed * 3.6) + ' km/h' : 'N/A'}<br>' +
            'Accuracy: ${newLocation.accuracy ? Math.round(newLocation.accuracy) + 'm' : 'N/A'}'
          );
        } else {
          // Calculate heading if we have previous position
          let heading = 0;
          if (window.lastLatLng) {
            heading = L.GeometryUtil.bearing(
              window.lastLatLng,
              L.latLng(${newLocation.latitude}, ${newLocation.longitude})
            );
          }
          window.lastLatLng = L.latLng(${newLocation.latitude}, ${newLocation.longitude});

          // Smoothly animate marker movement with rotation
          const newLatLng = L.latLng(${newLocation.latitude}, ${newLocation.longitude});
          
          // Use requestAnimationFrame for smoother animation
          const animateMarker = () => {
            const currentLatLng = window.driverMarker.getLatLng();
            const newLat = currentLatLng.lat + (newLatLng.lat - currentLatLng.lat) * 0.1;
            const newLng = currentLatLng.lng + (newLatLng.lng - currentLatLng.lng) * 0.1;
            
            window.driverMarker.setLatLng([newLat, newLng]);
            window.driverMarker.setRotationAngle(heading);
            
            if (Math.abs(newLat - newLatLng.lat) > 0.00001 || Math.abs(newLng - newLatLng.lng) > 0.00001) {
              requestAnimationFrame(animateMarker);
            }
          };
          
          requestAnimationFrame(animateMarker);
          
          // Update popup content
          window.driverMarker.setPopupContent(
            '<b>Bus Location</b><br>' +
            'Last updated: ${new Date(newLocation.last_updated).toLocaleTimeString()}<br>' +
            'Speed: ${newLocation.speed ? Math.round(newLocation.speed * 3.6) + ' km/h' : 'N/A'}<br>' +
            'Accuracy: ${newLocation.accuracy ? Math.round(newLocation.accuracy) + 'm' : 'N/A'}'
          );
        }

        // Add smooth pulsing effect to the marker
        const markerElement = window.driverMarker.getElement();
        if (markerElement) {
          markerElement.style.transition = 'all 0.3s ease-in-out';
          markerElement.style.transform = 'scale(1.1)';
          setTimeout(() => {
            markerElement.style.transform = 'scale(1)';
          }, 300);
        }

        // Auto-center map on driver if zoomed in
        if (window.isZoomedIn) {
          map.flyTo([${newLocation.latitude}, ${newLocation.longitude}], 15, {
            duration: 0.5,
            easeLinearity: 0.25
          });
        }

        // Add accuracy circle
        if (${newLocation.accuracy}) {
          if (!window.accuracyCircle) {
            window.accuracyCircle = L.circle([${newLocation.latitude}, ${newLocation.longitude}], {
              radius: ${newLocation.accuracy},
              color: '#2196F3',
              fillColor: '#2196F3',
              fillOpacity: 0.2,
              weight: 1
            }).addTo(map);
          } else {
            // Smoothly animate accuracy circle
            const currentRadius = window.accuracyCircle.getRadius();
            const targetRadius = ${newLocation.accuracy};
            const animateCircle = () => {
              const newRadius = currentRadius + (targetRadius - currentRadius) * 0.1;
              window.accuracyCircle.setRadius(newRadius);
              window.accuracyCircle.setLatLng([${newLocation.latitude}, ${newLocation.longitude}]);
              
              if (Math.abs(newRadius - targetRadius) > 1) {
                requestAnimationFrame(animateCircle);
              }
            };
            
            requestAnimationFrame(animateCircle);
          }
        }
      }
    `;

    webViewRef.current.injectJavaScript(script);
  };

  const handleStopStatusUpdate = async (stopData: any) => {
    try {
      // Update local stops state
      setStops(prevStops => 
        prevStops.map(stop => 
          stop.stop_order === stopData.stop_order ? { ...stop, status: stopData.status } : stop
        )
      );

      // Show notification based on status
      if (stopData.status === 'approaching') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Bus Approaching Stop',
            body: `Bus ${busInfo?.bus_number} is approaching ${stopData.stop_name}`,
            sound: true,
          },
          trigger: null,
        });
      } else if (stopData.status === 'arrived') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Bus Arrived at Stop',
            body: `Bus ${busInfo?.bus_number} has arrived at ${stopData.stop_name}`,
            sound: true,
          },
          trigger: null,
        });
      } else if (stopData.status === 'departed') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Bus Departed Stop',
            body: `Bus ${busInfo?.bus_number} has departed from ${stopData.stop_name}`,
            sound: true,
          },
          trigger: null,
        });
      }
    } catch (err) {
      console.error('Error handling stop status update:', err);
    }
  };

  // Add new function to check distance and send notifications
  const checkDistanceAndNotify = async (currentLocation: DriverLocation) => {
    try {
      if (!stops.length || !currentLocation) return;

      // Find the nearest stop
      let nearestStop = null;
      let minDistance = Infinity;

      for (const stop of stops) {
        const distance = calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          stop.latitude,
          stop.longitude
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestStop = stop;
        }
      }

      if (nearestStop && minDistance <= 1000) { // 1km in meters
        // Check if we need to send approaching notification
        if (nearestStop.status !== 'approaching' && nearestStop.status !== 'arrived' && nearestStop.status !== 'departed') {
          // Update stop status to approaching
          const { error } = await supabase
            .from('route_stops')
            .update({ status: 'approaching' })
            .eq('bus_number', busNumber)
            .eq('stop_order', nearestStop.stop_order);

          if (!error) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Bus Approaching',
                body: `Bus ${busInfo?.bus_number} is approaching ${nearestStop.stop_name} (${Math.round(minDistance)}m away)`,
                sound: true,
              },
              trigger: null,
            });
          }
        }

        // Check if bus has arrived (within 50m)
        if (minDistance <= 50 && nearestStop.status !== 'arrived' && nearestStop.status !== 'departed') {
          const { error } = await supabase
            .from('route_stops')
            .update({ 
              status: 'arrived',
              arrival_time: new Date().toLocaleTimeString()
            })
            .eq('bus_number', busNumber)
            .eq('stop_order', nearestStop.stop_order);

          if (!error) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Bus Arrived',
                body: `Bus ${busInfo?.bus_number} has arrived at ${nearestStop.stop_name}`,
                sound: true,
              },
              trigger: null,
            });
          }
        }

        // Check if bus has departed (moved more than 50m away after arriving)
        if (minDistance > 50 && nearestStop.status === 'arrived') {
          const { error } = await supabase
            .from('route_stops')
            .update({ 
              status: 'departed',
              departure_time: new Date().toLocaleTimeString()
            })
            .eq('bus_number', busNumber)
            .eq('stop_order', nearestStop.stop_order);

          if (!error) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: 'Bus Departed',
                body: `Bus ${busInfo?.bus_number} has departed from ${nearestStop.stop_name}`,
                sound: true,
              },
              trigger: null,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error in checkDistanceAndNotify:', err);
    }
  };

  const updateMapMarkers = () => {
    if (!webViewRef.current || stops.length === 0) return;

    const script = `
      if (typeof map !== 'undefined') {
        // Clear existing markers and polylines
        if (window.markers) {
          window.markers.forEach(marker => marker.remove());
        }
        if (window.routeLine) {
          window.routeLine.remove();
        }
        if (window.progressLine) {
          window.progressLine.remove();
        }
        window.markers = [];

        // Add stop markers with numbers and status colors
        ${stops.map((stop, index) => `
          const marker${index} = L.marker([${stop.latitude}, ${stop.longitude}], {
            icon: L.divIcon({
              className: 'custom-marker',
              html: '<div style="background-color: ${
                stop.status === 'departed' ? '#4CAF50' : 
                stop.status === 'arrived' ? '#FFC107' : 
                stop.status === 'approaching' ? '#2196F3' : '#ff4444'
              }; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${index + 1}</div>'
            })
          }).addTo(map);
          
          marker${index}.bindPopup(
            '<b>${index + 1}. ${stop.stop_name}</b><br>' +
            'Arrival: ${formatTime(stop.arrival_time)}<br>' +
            'Status: ${stop.status || 'Pending'}<br>' +
            ${stop.departure_time ? `'Departed: ${formatTime(stop.departure_time)}'` : ''}
          );
          
          window.markers.push(marker${index});
        `).join('')}

        // Draw route line between stops
        const routeCoordinates = [
          ${stops.map(stop => `[${stop.latitude}, ${stop.longitude}]`).join(',\n')}
        ];
        
        // Use OSRM for actual road route
        fetch('https://router.project-osrm.org/route/v1/driving/' + 
          routeCoordinates.map(coord => coord.reverse().join(',')).join(';') +
          '?overview=full&geometries=geojson'
        )
          .then(response => response.json())
          .then(data => {
            if (data.routes && data.routes[0]) {
              const route = data.routes[0];
              const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

              // Main route line
              window.routeLine = L.polyline(coordinates, {
                color: '#4CAF50',
                weight: 4,
                opacity: 0.8,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);

              // Add progress line if driver location is available
              ${driverLocation ? `
                const driverCoords = [${driverLocation.latitude}, ${driverLocation.longitude}];
                const nearestPoint = L.GeometryUtil.closest(map, window.routeLine, driverCoords);
                const progressCoords = coordinates.slice(0, coordinates.indexOf(nearestPoint) + 1);
                
                window.progressLine = L.polyline(progressCoords, {
                  color: '#2196F3',
                  weight: 4,
                  opacity: 0.8,
                  lineCap: 'round',
                  lineJoin: 'round'
                }).addTo(map);
              ` : ''}
            }
          })
          .catch(error => console.error('Error fetching route:', error));
      }
    `;

    webViewRef.current.injectJavaScript(script);
  };

  const getLocalWeather = (latitude: number, longitude: number) => {
    // Get current time and month
    const now = new Date();
    const month = now.getMonth();
    const hour = now.getHours();

    // Simple weather simulation based on time and location
    let temperature = 25; // Base temperature
    let condition = 'Clear';

    // Adjust temperature based on time of day
    if (hour >= 6 && hour < 12) {
      temperature += 5; // Morning warmth
    } else if (hour >= 12 && hour < 18) {
      temperature += 10; // Afternoon heat
    } else if (hour >= 18 && hour < 22) {
      temperature += 2; // Evening cool
    } else {
      temperature -= 5; // Night cold
    }

    // Adjust for season (simple simulation)
    if (month >= 3 && month <= 5) {
      temperature += 5; // Summer
      condition = 'Sunny';
    } else if (month >= 6 && month <= 8) {
      temperature += 10; // Peak summer
      condition = 'Hot';
    } else if (month >= 9 && month <= 11) {
      temperature -= 2; // Autumn
      condition = 'Cloudy';
    } else {
      temperature -= 5; // Winter
      condition = 'Cool';
    }

    // Add some randomness
    temperature += Math.random() * 5 - 2.5;
    temperature = Math.round(temperature);

    return {
      temperature,
      condition,
      icon: getWeatherIcon(condition)
    };
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return '☀️';
      case 'hot':
        return '🔥';
      case 'cloudy':
        return '☁️';
      case 'cool':
        return '❄️';
      default:
        return '🌤️';
    }
  };

  const calculateETA = async (currentLocation: DriverLocation, nextStop: RouteStop) => {
    try {
      // Calculate distance
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        nextStop.latitude,
        nextStop.longitude
      );

      // Get local weather
      const weather = getLocalWeather(nextStop.latitude, nextStop.longitude);

      // Calculate base speed (km/h) based on time of day and weather
      let baseSpeed = 30; // Default speed in km/h
      
      // Adjust speed based on time of day
      const hour = new Date().getHours();
      if (hour >= 7 && hour <= 9) {
        baseSpeed = 20; // Morning rush hour
      } else if (hour >= 17 && hour <= 19) {
        baseSpeed = 20; // Evening rush hour
      }

      // Adjust speed based on weather condition
      if (weather.condition === 'Hot') {
        baseSpeed = 25; // Slightly slower in hot weather
      } else if (weather.condition === 'Cool') {
        baseSpeed = 28; // Slightly slower in cool weather
      }

      // Calculate ETA in minutes
      const speedInMetersPerMinute = (baseSpeed * 1000) / 60;
      const eta = Math.round(distance / speedInMetersPerMinute);

      return {
        eta,
        weather
      };
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return { eta: null, weather: null };
    }
  };

  const fetchBusInfo = async () => {
    try {
      const { data: busData, error: busError } = await supabase
        .from('buses')
        .select('*')
        .eq('bus_number', busNumber)
        .single();

      if (busError) throw busError;

      // Get all stops for the route
      const { data: stopsData, error: stopsError } = await supabase
        .from('bus_routes_view')
        .select('*')
        .eq('bus_number', busNumber)
        .order('stop_order');

      if (stopsError) throw stopsError;

      // Get current location
      const { data: locationData, error: locationError } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('bus_number', busNumber)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (locationError) throw locationError;

      if (busData && stopsData) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        let completedStops = 0;
        let currentStop = null;
        let nextStop = null;

        for (let i = 0; i < stopsData.length; i++) {
          const stop = stopsData[i];
          const stopTime = parseInt(stop.arrival_time.split(':')[0]) * 60 + parseInt(stop.arrival_time.split(':')[1]);
          
          if (stopTime < currentTime) {
            completedStops++;
            currentStop = stop;
          } else if (!nextStop) {
            nextStop = stop;
            break;
          }
        }

        // Calculate ETA and get weather for next stop
        let etaData = null;
        if (locationData && nextStop) {
          etaData = await calculateETA(locationData, nextStop);
        }

        setBusInfo({
          bus_number: busData.bus_number,
          route_name: busData.route_name,
          driver_name: busData.driver_name || 'Not Available',
          driver_contact: busData.driver_contact || 'Not Available',
          total_stops: stopsData.length,
          completed_stops: completedStops,
          remaining_stops: stopsData.length - completedStops,
          status: nextStop ? calculateStatus(nextStop.arrival_time, nextStop.estimated_time) : 'On Time',
          current_stop: currentStop ? {
            stop_name: currentStop.stop_name,
            arrival_time: currentStop.arrival_time,
            departure_time: currentStop.departure_time
          } : undefined,
          next_stop: nextStop ? {
            stop_name: nextStop.stop_name,
            arrival_time: nextStop.arrival_time,
            estimated_time: nextStop.estimated_time,
            distance: etaData?.eta ? Math.round(etaData.eta * 30 * 1000 / 60) : null, // Convert ETA to distance
            eta: etaData?.eta ?? null, // Ensure eta is never undefined
            weather: etaData?.weather ?? undefined
          } : undefined
        });
      }
    } catch (err) {
      console.error('Error fetching bus info:', err);
    }
  };

  const fetchStops = async () => {
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

      if (error) throw error;
      
      if (data) {
        setStops(data);
        updateMapMarkers();

        // Update bus info with completed stops count
        const completedStops = data.filter(stop => stop.status === 'departed').length;
        setBusInfo(prev => prev ? {
          ...prev,
          completed_stops: completedStops,
          remaining_stops: data.length - completedStops
        } : null);
      }
    } catch (err) {
      console.error('Error fetching stops:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusInfo();
    fetchStops();
  }, [busNumber]);

  const formatTime = (timeStr: string) => {
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const getMapUrl = () => {
    const mapTypeUrl = mapType === 'standard' ? 
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' :
      mapType === 'satellite' ?
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' :
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <script src="https://unpkg.com/leaflet-rotatedmarker@0.2.0/leaflet.rotatedMarker.js"></script>
          <script src="https://unpkg.com/leaflet-geometryutil"></script>
          <style>
            body, html { margin: 0; padding: 0; height: 100%; }
            #map { height: 100%; width: 100%; }
            .leaflet-control-zoom { display: none !important; }
            
            .bus-marker {
              transition: all 0.3s ease-in-out;
              will-change: transform;
            }
            
            .bus-marker svg {
              filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
              transform-origin: center;
              transition: transform 0.3s ease-in-out;
            }

            .leaflet-marker-icon {
              transition: transform 0.3s ease-in-out;
              will-change: transform;
            }

            .leaflet-marker-shadow {
              transition: transform 0.3s ease-in-out;
              will-change: transform;
            }

            .leaflet-zoom-animated {
              transition: transform 0.3s ease-in-out;
              will-change: transform;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            let map = L.map('map', {
              zoomControl: false,
              zoomSnap: 0.1,
              zoomDelta: 0.1,
              preferCanvas: true,
              renderer: L.canvas()
            });

            L.tileLayer('${mapTypeUrl}', {
              attribution: '© OpenStreetMap contributors',
              keepBuffer: 4
            }).addTo(map);

            // Initialize with all stops visible
            const stops = ${JSON.stringify(stops)};
            if (stops && stops.length > 0) {
              const bounds = L.latLngBounds(stops.map(stop => [stop.latitude, stop.longitude]));
              map.fitBounds(bounds.pad(0.1));
            } else {
              map.setView([17.3850, 78.4867], 13);
            }

            // Store zoom state
            window.isZoomedIn = false;
            window.markers = [];
            window.routeLine = null;
            window.progressLine = null;
            window.driverMarker = null;
            window.lastLatLng = null;

            // Handle map zoom events
            map.on('zoomend', () => {
              window.isZoomedIn = map.getZoom() >= 15;
            });

            // Handle map drag events
            map.on('dragend', () => {
              window.isZoomedIn = map.getZoom() >= 15;
            });
          </script>
        </body>
      </html>
    `;
  };

  const handleMapTypeChange = (type: 'standard' | 'satellite' | 'hybrid') => {
    setMapType(type);
    webViewRef.current?.reload();
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const script = `map.${direction === 'in' ? 'zoomIn' : 'zoomOut'}();`;
    webViewRef.current?.injectJavaScript(script);
  };

  const centerOnDriver = () => {
    if (!driverLocation || !stops.length) return;

    const script = `
      if (typeof map !== 'undefined') {
        if (window.isZoomedIn) {
          // Zoom out to show all stops
          const group = new L.featureGroup(window.markers);
          map.fitBounds(group.getBounds().pad(0.1));
          window.isZoomedIn = false;
        } else {
          // Zoom in on driver with smooth animation
          map.flyTo([${driverLocation.latitude}, ${driverLocation.longitude}], 15, {
            duration: 1,
            easeLinearity: 0.25
          });
          window.isZoomedIn = true;
        }
      }
    `;

    webViewRef.current?.injectJavaScript(script);
  };

  const handleSOSPress = async () => {
    if (sosActive) return;
    
    setSosActive(true);
    setSosCountdown(SOS_COUNTDOWN_SECONDS);
    
    // Start countdown
    const countdownInterval = setInterval(() => {
      setSosCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          setSosActive(false);
          // Send location when countdown ends
          sendSOSLocation();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      
      // Fetch latest location
      const { data: locationData, error: locationError } = await supabase
        .from('bus_locations')
        .select('*')
        .eq('bus_number', busNumber)
        .order('last_updated', { ascending: false })
        .limit(1)
                  .single();

      if (locationError) {
        console.error('Location fetch error:', locationError);
        Alert.alert('Error', `Failed to fetch location: ${locationError.message}`);
        return;
      }

      if (locationData) {
        setDriverLocation(locationData);
        setLastUpdateTime(new Date().toLocaleTimeString());
        updateDriverMarker(locationData);
        
        // Check for crossed stops
        await checkDistanceAndNotify(locationData);
      }

      // Refresh bus info
      await fetchBusInfo();
      
      // Refresh stops
      await fetchStops();

      // Force map update
      if (webViewRef.current) {
        webViewRef.current.reload();
      }

      Alert.alert('Success', 'Location and route information refreshed successfully');
              } catch (err) {
      console.error('Refresh error:', err);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
              } finally {
      setIsRefreshing(false);
    }
  };

  const handleShareLocation = async () => {
    try {
      if (!driverLocation) {
        Alert.alert('Error', 'Bus location not available');
        return;
      }

      const message = `Bus ${busInfo?.bus_number} is currently at:\n\n` +
        `📍 Location: https://www.google.com/maps?q=${driverLocation.latitude},${driverLocation.longitude}\n` +
        `🕒 Last Updated: ${new Date(driverLocation.last_updated).toLocaleTimeString()}\n` +
        `🚌 Bus Number: ${busInfo?.bus_number}\n` +
        `🛣️ Route: ${busInfo?.route_name}\n\n` +
        `Track this bus in real-time using BusCoordinate app!`;

      const result = await Share.share({
        message: message,
        title: 'Share Bus Location'
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with specific app
          console.log(`Shared via ${result.activityType}`);
        } else {
          // Shared
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Error', 'Failed to share location');
    }
  };

  const handlePassengerResponse = async (isOnBus: boolean) => {
    try {
      if (isOnBus) {
        // Increment passenger count
        const { data, error } = await supabase
          .from('bus_passengers')
          .upsert({
            bus_number: busNumber,
            passenger_count: passengerCount + 1,
            last_updated: new Date().toISOString()
          });

        if (!error) {
          setPassengerCount(prev => prev + 1);
        }
      }
      setShowPassengerPopup(false);
    } catch (error) {
      console.error('Error updating passenger count:', error);
    }
  };

  const handleEmergencyCall = async () => {
    try {
      const phoneUrl = `tel:${EMERGENCY_PHONE_NUMBER}`;
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Unable to make phone calls on this device');
      }
    } catch (error) {
      console.error('Error making emergency call:', error);
      Alert.alert('Error', 'Failed to make emergency call');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with CLG Logo and Back Navigation */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#1a1a1a' : '#fff' }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/01home')}
        >
          <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <View style={styles.logoContainer}>
          <Text style={[styles.logoText, { color: isDarkMode ? '#fff' : '#000' }]}>Bus {busInfo?.bus_number}</Text>
        </View>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShareLocation}
        >
          <Ionicons name="share-social" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

      <View style={styles.passengerCountContainer}>
        <View style={styles.passengerCountBox}>
          <Ionicons name="people" size={20} color="#fff" />
          <Text style={styles.passengerCountText}>{passengerCount}</Text>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: getMapUrl() }}
          style={styles.webview}
          onLoadEnd={() => updateMapMarkers()}
        />
        
        {/* Compact Info Panel */}
        <View style={[styles.compactInfoPanel, { 
          backgroundColor: isDarkMode ? 'rgba(33, 33, 33, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderWidth: 1,
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }]}>
          {/* Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusLeft}>
              <View style={[styles.liveIndicator, { backgroundColor: isLive ? '#4CAF50' : '#FF3333' }]}>
                <Text style={styles.liveText}>{isLive ? 'LIVE' : 'OFFLINE'}</Text>
            </View>
              <View style={[styles.statusBadge, { 
                backgroundColor: busInfo?.status === 'On Time' ? '#4CAF50' : 
                               busInfo?.status === 'Delayed' ? '#FFC107' : '#2196F3' 
              }]}>
                <Text style={styles.statusText}>{busInfo?.status}</Text>
          </View>
          <TouchableOpacity 
            style={[
                  styles.refreshButton,
                  isRefreshing && styles.refreshButtonActive,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                ]}
                onPress={handleRefresh}
                disabled={isRefreshing}
          >
            <Ionicons 
                  name={isRefreshing ? "refresh" : "refresh-outline"} 
                  size={16} 
                  color={isRefreshing ? "#fff" : (isDarkMode ? "#fff" : "#000")} 
            />
          </TouchableOpacity>
        </View>
            <Text style={[styles.lastUpdated, { color: isDarkMode ? '#ccc' : '#666' }]}>
              Last updated: {lastUpdateTime || 'N/A'}
            </Text>
          </View>

          {/* Next Stop Info */}
          {busInfo?.next_stop && (
            <View style={[styles.nextStopContainer, {
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            }]}>
              <View style={styles.nextStopHeader}>
                <Text style={[styles.nextStopLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>Next Stop</Text>
                {busInfo.next_stop.weather && (
                  <View style={[styles.weatherInfo, {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                  }]}>
                    <Text style={[styles.weatherText, { color: isDarkMode ? '#fff' : '#000' }]}>
                      {busInfo.next_stop.weather.icon} {Math.round(busInfo.next_stop.weather.temperature)}°C
                </Text>
              </View>
            )}
              </View>
              <Text style={[styles.nextStopName, { color: isDarkMode ? '#fff' : '#000' }]}>
                {busInfo.next_stop.stop_name}
                </Text>
              <View style={styles.nextStopDetails}>
                <Text style={[styles.arrivalTime, { color: isDarkMode ? '#ccc' : '#666' }]}>
                  Arrival: {formatTime(busInfo.next_stop.arrival_time)}
                </Text>
                {busInfo.next_stop.eta && (
                  <Text style={[styles.etaText, { color: isDarkMode ? '#64B5F6' : '#2196F3' }]}>
                    ETA: {busInfo.next_stop.eta} min
                  </Text>
                )}
              </View>
              </View>
            )}

          {/* Quick Stats */}
          <View style={[styles.quickStats, {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : '#000' }]}>
                {busInfo?.completed_stops || 0}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
                Completed
              </Text>
            </View>
            <View style={[styles.statDivider, { 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' 
            }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : '#000' }]}>
                {busInfo?.remaining_stops || 0}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
                Remaining
              </Text>
            </View>
            <View style={[styles.statDivider, { 
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' 
            }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDarkMode ? '#fff' : '#000' }]}>
                {busInfo?.total_stops || 0}
              </Text>
              <Text style={[styles.statLabel, { color: isDarkMode ? '#ccc' : '#666' }]}>
                Total Stops
              </Text>
          </View>
        </View>

          {/* Emergency Button */}
          <TouchableOpacity 
            style={[styles.sosButton, sosActive && { backgroundColor: '#FF0000' }]}
            onPress={handleSOSPress}
            disabled={sosActive}
          >
            <Ionicons name="alert-circle" size={24} color="#fff" />
            {sosCountdown ? (
              <Text style={styles.sosCountdown}>{sosCountdown}</Text>
            ) : (
              <Text style={styles.sosButtonText}>One-Tap SOS</Text>
            )}
                </TouchableOpacity>
              </View>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.mapControl, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}
            onPress={() => handleZoom('in')}
          >
            <Ionicons name="add" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mapControl, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}
            onPress={() => handleZoom('out')}
          >
            <Ionicons name="remove" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.mapControl, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }]}
            onPress={centerOnDriver}
          >
            <Ionicons name="locate" size={24} color={isDarkMode ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.emergencyCallButton, { backgroundColor: '#FF3333' }]}
            onPress={handleEmergencyCall}
          >
            <Ionicons name="call" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Crossed Stops Section */}
      {crossedStops.length > 0 && (
        <View style={styles.crossedStopsContainer}>
          <Text style={styles.crossedStopsTitle}>Recently Crossed Stops</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.crossedStopsScroll}
          >
            {crossedStops.map((stop, index) => (
              <View key={index} style={styles.crossedStopItem}>
                <Text style={styles.crossedStopName}>{stop.stop_name}</Text>
                <Text style={styles.crossedStopTime}>
                  {new Date(stop.arrival_time).toLocaleTimeString()}
                </Text>
          </View>
            ))}
          </ScrollView>
      </View>
      )}

      {showPassengerPopup && (
        <View style={styles.passengerPopup}>
          <View style={styles.passengerPopupContent}>
            <Text style={styles.passengerPopupTitle}>Are you on this bus?</Text>
            <View style={styles.passengerButtons}>
              <TouchableOpacity 
                style={[styles.passengerButton, styles.yesButton]}
                onPress={() => handlePassengerResponse(true)}
              >
                <Text style={styles.passengerButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.passengerButton, styles.noButton]}
                onPress={() => handlePassengerResponse(false)}
              >
                <Text style={styles.passengerButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  mapControlsContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mapControl: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  crossedStopsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  crossedStopsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  crossedStopsScroll: {
    maxHeight: 100,
  },
  crossedStopItem: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 120,
  },
  crossedStopName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  crossedStopTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  compactInfoPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
  },
  nextStopContainer: {
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  nextStopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  nextStopLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  nextStopName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  nextStopDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
  },
  arrivalTime: {
    fontSize: 12,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3333',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sosCountdown: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    gap: 8,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  shareButton: {
    padding: 8,
    borderRadius: 20,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  refreshButton: {
    padding: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  refreshButtonActive: {
    backgroundColor: '#2196F3',
  },
  liveIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  weatherText: {
    fontSize: 12,
    fontWeight: '500',
  },
  etaText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  passengerPopup: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  passengerPopupContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  passengerPopupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  passengerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  passengerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  yesButton: {
    backgroundColor: '#4CAF50',
  },
  noButton: {
    backgroundColor: '#FF3333',
  },
  passengerButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  passengerCountContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 100,
  },
  passengerCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 8,
    gap: 4,
  },
  passengerCountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emergencyCallButton: {
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
}); 