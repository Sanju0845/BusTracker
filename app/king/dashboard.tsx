import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart, BarChart } from 'react-native-chart-kit';

export default function KingDashboard() {
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false);
  const screenWidth = Dimensions.get('window').width;

  // Bus fleet data
  const busFleet = [
    { number: 'TS07EP0921', route: 'LB Nagar - KMCE', trips: 18, avgDelay: 2.5, fuelCost: 3800, maintenanceCost: 2500 },
    { number: 'TS07EP0922', route: 'Secunderabad - KMCE', trips: 16, avgDelay: 3.8, fuelCost: 4200, maintenanceCost: 2800 },
    { number: 'TS07EP0923', route: 'Kukatpally - KMCE', trips: 20, avgDelay: 1.5, fuelCost: 4500, maintenanceCost: 3000 },
    { number: 'TS07EP0924', route: 'Uppal - KMCE', trips: 15, avgDelay: 4.2, fuelCost: 4000, maintenanceCost: 2700 },
    { number: 'TS07EP0925', route: 'Mehdipatnam - KMCE', trips: 17, avgDelay: 2.8, fuelCost: 4300, maintenanceCost: 2900 },
  ];

  // Calculate total metrics
  const totalMetrics = {
    dailyTrips: busFleet.reduce((sum, bus) => sum + bus.trips, 0),
    avgDelay: (busFleet.reduce((sum, bus) => sum + bus.avgDelay, 0) / busFleet.length).toFixed(1),
    fuelCost: busFleet.reduce((sum, bus) => sum + bus.fuelCost, 0),
    maintenanceCost: busFleet.reduce((sum, bus) => sum + bus.maintenanceCost, 0),
  };

  // Weekly data based on actual patterns
  const weeklyData = {
    fuelCost: [38000, 39500, 41000, 40500, 42000, 39000, 38500],
    maintenanceCost: [25000, 26000, 28000, 27000, 29000, 26500, 25500],
    trips: [86, 88, 90, 85, 87, 84, 82],
    avgDelay: [2.8, 3.0, 3.2, 2.9, 3.1, 2.7, 2.5],
  };

  // Route optimization based on actual data
  const routeOptimization = {
    underUsedRoute: "Uppal - KMCE",
    suggestedMerge: "LB Nagar - KMCE",
    potentialSavings: 15000,
  };

  // Budget insights based on actual costs
  const budgetInsights = {
    monthlyFuel: 1200000,
    monthlyMaintenance: 800000,
    savingsSuggestion: "Optimize Uppal route by combining with LB Nagar route during off-peak hours",
  };

  // Emergency alert data
  const emergencyAlert = {
    title: "Route Delay Alert",
    message: "Secunderabad route delayed by 15 mins due to traffic at Paradise Circle",
    timestamp: new Date().toLocaleTimeString(),
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEmergencyAlert(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isKingLoggedIn');
      router.replace('/01home');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#FFA500']}
        style={styles.header}
      >
        <Text style={styles.title}>Fleet Management Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Fleet Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fleet Overview</Text>
          <View style={styles.fleetCard}>
            {busFleet.map((bus, index) => (
              <View key={index} style={styles.busItem}>
                <View style={styles.busHeader}>
                  <Ionicons name="bus-outline" size={20} color="#4CAF50" />
                  <Text style={styles.busNumber}>{bus.number}</Text>
                </View>
                <Text style={styles.busRoute}>{bus.route}</Text>
                <View style={styles.busMetrics}>
                  <View style={styles.busMetric}>
                    <Text style={styles.busMetricValue}>{bus.trips}</Text>
                    <Text style={styles.busMetricLabel}>Trips</Text>
                  </View>
                  <View style={styles.busMetric}>
                    <Text style={styles.busMetricValue}>{bus.avgDelay} min</Text>
                    <Text style={styles.busMetricLabel}>Delay</Text>
                  </View>
                  <View style={styles.busMetric}>
                    <Text style={styles.busMetricValue}>₹{bus.fuelCost}</Text>
                    <Text style={styles.busMetricLabel}>Fuel</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Performance</Text>
          <View style={styles.metricsCard}>
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={24} color="#4CAF50" />
              <Text style={styles.metricValue}>{totalMetrics.dailyTrips}</Text>
              <Text style={styles.metricLabel}>Total Trips</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="alert-circle-outline" size={24} color="#FFA500" />
              <Text style={styles.metricValue}>{totalMetrics.avgDelay} min</Text>
              <Text style={styles.metricLabel}>Avg Delay</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="cash-outline" size={24} color="#4CAF50" />
              <Text style={styles.metricValue}>₹{totalMetrics.fuelCost}</Text>
              <Text style={styles.metricLabel}>Daily Fuel</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="construct-outline" size={24} color="#FFA500" />
              <Text style={styles.metricValue}>₹{totalMetrics.maintenanceCost}</Text>
              <Text style={styles.metricLabel}>Daily Maintenance</Text>
            </View>
          </View>
        </View>

        {/* Weekly Fuel Cost Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Fuel Cost (₹)</Text>
          <LineChart
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                data: weeklyData.fuelCost
              }]
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Weekly Maintenance Cost Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Maintenance Cost (₹)</Text>
          <BarChart
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{
                data: weeklyData.maintenanceCost
              }]
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            yAxisLabel="₹"
            yAxisSuffix=""
          />
        </View>

        {/* Route Optimization */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Route Optimization</Text>
          <View style={styles.optimizationCard}>
            <Ionicons name="analytics-outline" size={24} color="#FFA500" />
            <View style={styles.optimizationContent}>
              <Text style={styles.optimizationText}>
                {routeOptimization.underUsedRoute} is under-used. Consider merging with {routeOptimization.suggestedMerge}.
              </Text>
              <Text style={styles.savingsText}>
                Potential Monthly Savings: ₹{routeOptimization.potentialSavings}
              </Text>
            </View>
          </View>
        </View>

        {/* Budget Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Budget Insights</Text>
          <View style={styles.budgetCard}>
            <View style={styles.budgetItem}>
              <Ionicons name="wallet-outline" size={24} color="#4CAF50" />
              <Text style={styles.budgetValue}>₹{budgetInsights.monthlyFuel}</Text>
              <Text style={styles.budgetLabel}>Monthly Fuel</Text>
            </View>
            <View style={styles.budgetItem}>
              <Ionicons name="construct-outline" size={24} color="#FFA500" />
              <Text style={styles.budgetValue}>₹{budgetInsights.monthlyMaintenance}</Text>
              <Text style={styles.budgetLabel}>Monthly Maintenance</Text>
            </View>
            <View style={styles.savingsSuggestion}>
              <Ionicons name="bulb-outline" size={20} color="#FFA500" />
              <Text style={styles.savingsText}>{budgetInsights.savingsSuggestion}</Text>
            </View>
          </View>
        </View>

        {/* Emergency Alert */}
        {showEmergencyAlert && (
          <View style={styles.emergencyAlert}>
            <Ionicons name="alert-circle" size={24} color="#FF0000" />
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>{emergencyAlert.title}</Text>
              <Text style={styles.emergencyMessage}>{emergencyAlert.message}</Text>
              <Text style={styles.emergencyTime}>{emergencyAlert.timestamp}</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowEmergencyAlert(false)}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
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
  fleetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  busItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  busHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  busNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  busRoute: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  busMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  busMetric: {
    alignItems: 'center',
  },
  busMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  busMetricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  metricsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
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
  chart: {
    marginVertical: 8,
    borderRadius: 12,
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
  optimizationContent: {
    flex: 1,
    marginLeft: 12,
  },
  optimizationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
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
    color: '#FFA500',
  },
  emergencyAlert: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF0000',
  },
  emergencyContent: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF0000',
    marginBottom: 4,
  },
  emergencyMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  emergencyTime: {
    fontSize: 12,
    color: '#666',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,0,0,0.2)',
  },
}); 