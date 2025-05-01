import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

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

  // Static performance metrics
  const performanceMetrics = {
    dailyTrips: 74,
    avgDelay: 3.2,
    fuelCost: 4200,
  };

  // Static route optimization data
  const routeOptimization = {
    underUsedRoute: "Route 4",
    suggestedMerge: "Route 3",
  };

  // Static budget insights
  const budgetInsights = {
    monthlyFuel: 85000,
    savingsSuggestion: "Avoid half-empty night trips",
  };

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
          const { data: passengerData } = await supabase
            .from('bus_passengers')
            .select('passenger_count')
            .eq('bus_number', bus.bus_number)
            .single();

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
      <LinearGradient
        colors={['#2196F3', '#1976D2']}
        style={styles.header}
      >
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Fleet Performance Dashboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fleet Performance</Text>
          <View style={styles.metricsCard}>
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={24} color="#2196F3" />
              <Text style={styles.metricValue}>{performanceMetrics.dailyTrips}</Text>
              <Text style={styles.metricLabel}>Daily Trips</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="alert-circle-outline" size={24} color="#FF9800" />
              <Text style={styles.metricValue}>{performanceMetrics.avgDelay} min</Text>
              <Text style={styles.metricLabel}>Avg Delay</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="cash-outline" size={24} color="#4CAF50" />
              <Text style={styles.metricValue}>₹{performanceMetrics.fuelCost}</Text>
              <Text style={styles.metricLabel}>Fuel/Day</Text>
            </View>
          </View>
        </View>

        {/* Route Optimization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Optimization</Text>
          <View style={styles.optimizationCard}>
            <Ionicons name="analytics-outline" size={24} color="#FF9800" />
            <Text style={styles.optimizationText}>
              {routeOptimization.underUsedRoute} is under-used. Consider merging with {routeOptimization.suggestedMerge}.
            </Text>
          </View>
        </View>

        {/* Budget Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget Insights</Text>
          <View style={styles.budgetCard}>
            <View style={styles.budgetItem}>
              <Ionicons name="wallet-outline" size={24} color="#4CAF50" />
              <Text style={styles.budgetValue}>₹{budgetInsights.monthlyFuel}</Text>
              <Text style={styles.budgetLabel}>Monthly Fuel Estimate</Text>
            </View>
            <View style={styles.savingsSuggestion}>
              <Ionicons name="bulb-outline" size={20} color="#FF9800" />
              <Text style={styles.savingsText}>{budgetInsights.savingsSuggestion}</Text>
            </View>
          </View>
        </View>

        {/* Bus List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Buses</Text>
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
        </View>
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
    paddingTop: Platform.OS === 'ios' ? 40 : 16,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  metricsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  optimizationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optimizationText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  budgetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  budgetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  savingsSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  savingsText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#FF9800',
  },
  busCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  busHeader: {
    marginBottom: 12,
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