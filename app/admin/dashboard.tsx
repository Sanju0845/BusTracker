import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BusInfo {
  bus_number: string;
  route_name: string;
  total_stops: number;
  current_passengers: number;
  status: string;
}

export default function AdminDashboard() {
  const [buses, setBuses] = useState<BusInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      const { data: busesData, error: busesError } = await supabase
        .from('buses')
        .select('*');

      if (busesError) throw busesError;

      const busesWithDetails = await Promise.all(
        busesData.map(async (bus) => {
          // Get passenger count
          const { data: passengerData } = await supabase
            .from('bus_passengers')
            .select('passenger_count')
            .eq('bus_number', bus.bus_number)
            .single();

          // Get total stops
          const { count: stopsCount } = await supabase
            .from('bus_routes')
            .select('*', { count: 'exact' })
            .eq('bus_number', bus.bus_number);

          return {
            ...bus,
            current_passengers: passengerData?.passenger_count || 0,
            total_stops: stopsCount || 0,
          };
        })
      );

      setBuses(busesWithDetails);
    } catch (error) {
      console.error('Error fetching buses:', error);
      Alert.alert('Error', 'Failed to fetch bus data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isAdminLoggedIn');
      router.replace('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {buses.map((bus) => (
          <View key={bus.bus_number} style={styles.busCard}>
            <View style={styles.busHeader}>
              <Text style={styles.busNumber}>{bus.bus_number}</Text>
              <Text style={styles.routeName}>{bus.route_name}</Text>
            </View>
            
            <View style={styles.busStats}>
              <View style={styles.statItem}>
                <Ionicons name="people" size={20} color="#2196F3" />
                <Text style={styles.statText}>{bus.current_passengers} Passengers</Text>
              </View>
              
              <View style={styles.statItem}>
                <Ionicons name="bus" size={20} color="#4CAF50" />
                <Text style={styles.statText}>{bus.total_stops} Stops</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2196F3',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  busCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  busHeader: {
    marginBottom: 16,
  },
  busNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  routeName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  busStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
}); 