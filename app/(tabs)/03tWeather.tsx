import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/ThemeContext';

interface WeatherData {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather: {
    main: string;
    description: string;
    icon: string;
  }[];
}

interface StopWeather {
  stop_name: string;
  weather: WeatherData;
  recommendations: string[];
}

export default function WeatherScreen() {
  const router = useRouter();
  const { busId, busNumber } = useLocalSearchParams();
  const [stopsWeather, setStopsWeather] = useState<StopWeather[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme, isDarkMode } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStopsAndWeather();
  }, [busNumber]);

  const fetchStopsAndWeather = async () => {
    try {
      const { data: stops, error } = await supabase
        .from('bus_routes_view')
        .select('stop_name, latitude, longitude')
        .eq('bus_number', busNumber)
        .order('stop_order');

      if (error) throw error;

      // Generate simulated weather data for each stop
      const weatherResults = stops.map((stop) => {
        // Generate random but realistic weather data
        const temp = 25 + (Math.random() * 5); // Temperature between 25-30°C
        const humidity = 50 + (Math.random() * 20); // Humidity between 50-70%
        const windSpeed = 2 + (Math.random() * 3); // Wind speed between 2-5 m/s
        
        const weatherTypes = [
          { main: 'Clear', description: 'clear sky', icon: '01d' },
          { main: 'Clouds', description: 'few clouds', icon: '02d' },
          { main: 'Clouds', description: 'scattered clouds', icon: '03d' }
        ];
        
        const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

        return {
          stop_name: stop.stop_name,
          weather: {
            temp: temp,
            feels_like: temp + (Math.random() * 2 - 1), // Feels like ±1°C
            humidity: humidity,
            wind_speed: windSpeed,
            weather: [randomWeather]
          },
          recommendations: getWeatherRecommendations({
            temp: temp,
            feels_like: temp + (Math.random() * 2 - 1),
            humidity: humidity,
            wind_speed: windSpeed,
            weather: [randomWeather]
          })
        };
      });

      setStopsWeather(weatherResults);
    } catch (error) {
      console.error('Error fetching stops:', error);
      setError('Failed to load weather information');
    } finally {
      setLoading(false);
    }
  };

  const getWeatherRecommendations = (weather: WeatherData): string[] => {
    const recommendations: string[] = [];
    const temp = weather.temp;
    const conditions = weather.weather[0].main.toLowerCase();

    if (temp < 25) {
      recommendations.push('Pleasant weather');
    } else if (temp > 28) {
      recommendations.push('Wear light clothing');
      recommendations.push('Stay hydrated');
    }

    if (weather.humidity > 60) {
      recommendations.push('Humid conditions');
    }

    if (weather.wind_speed > 4) {
      recommendations.push('Windy conditions');
    }

    if (conditions.includes('clear')) {
      recommendations.push('Carry sunglasses');
    } else if (conditions.includes('clouds')) {
      recommendations.push('Pleasant outdoor conditions');
    }

    return recommendations;
  };

  const getWeatherIcon = (iconCode: string): keyof typeof Ionicons.glyphMap => {
    const iconMap: { [key: string]: keyof typeof Ionicons.glyphMap } = {
      '01d': 'sunny',
      '01n': 'moon',
      '02d': 'partly-sunny',
      '02n': 'cloudy-night',
      '03d': 'cloud',
      '03n': 'cloud',
      '04d': 'cloudy',
      '04n': 'cloudy',
      '09d': 'rainy',
      '09n': 'rainy',
      '10d': 'rainy',
      '10n': 'rainy',
      '11d': 'thunderstorm',
      '11n': 'thunderstorm',
      '13d': 'snow',
      '13n': 'snow',
      '50d': 'water',
      '50n': 'water'
    };
    return iconMap[iconCode] || 'cloud';
  };

  const handleContinue = () => {
    router.push({
      pathname: '/(tabs)/04busroute',
      params: { busId, busNumber }
    });
  };

  const getCommonRecommendations = (stops: StopWeather[]): string[] => {
    const recommendationCounts: { [key: string]: number } = {};
    
    stops.forEach(stop => {
      stop.recommendations.forEach(rec => {
        recommendationCounts[rec] = (recommendationCounts[rec] || 0) + 1;
      });
    });

    // Get recommendations that appear in at least 50% of stops
    const threshold = Math.ceil(stops.length * 0.5);
    return Object.entries(recommendationCounts)
      .filter(([_, count]) => count >= threshold)
      .map(([rec]) => rec);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[theme.BACKGROUND_START, theme.BACKGROUND_END]}
        style={[styles.container, styles.centerContent]}
      >
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={[styles.loadingText, { color: theme.TEXT_SECONDARY }]}>Loading weather...</Text>
      </LinearGradient>
    );
  }

  const commonRecommendations = getCommonRecommendations(stopsWeather);

  return (
    <LinearGradient
      colors={[theme.BACKGROUND_START, theme.BACKGROUND_END]}
      style={styles.container}
    >
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.TEXT} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.TEXT }]}>Weather</Text>
        <Text style={[styles.headerSubtitle, { color: theme.TEXT_SECONDARY }]}>Bus {busNumber}</Text>
      </View>

      {commonRecommendations.length > 0 && (
        <View style={[
          styles.recommendationsBanner,
          { 
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.CARD_BACKGROUND,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.BORDER
          }
        ]}>
          <Ionicons name="information-circle" size={20} color={isDarkMode ? '#FFD700' : theme.PRIMARY} />
          <Text style={[styles.recommendationsBannerText, { color: theme.TEXT }]}>
            {commonRecommendations.join(' • ')}
          </Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {stopsWeather.map((stop, index) => (
          <View 
            key={index}
            style={[
              styles.weatherCard,
              { 
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : theme.CARD_BACKGROUND,
                borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : theme.BORDER
              }
            ]}
          >
            <View style={styles.stopHeader}>
              <Text style={[styles.stopName, { color: theme.TEXT }]}>{stop.stop_name}</Text>
              <Ionicons 
                name={getWeatherIcon(stop.weather.weather[0].icon)} 
                size={24} 
                color={isDarkMode ? '#FFD700' : theme.PRIMARY} 
              />
            </View>

            <View style={styles.weatherInfo}>
              <Text style={[styles.temperature, { color: theme.TEXT }]}>
                {Math.round(stop.weather.temp)}°C
              </Text>
              <View style={styles.weatherDetails}>
                <View style={styles.detailItem}>
                  <Ionicons name="water-outline" size={16} color={theme.TEXT_SECONDARY} />
                  <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>
                    {stop.weather.humidity}%
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="speedometer-outline" size={16} color={theme.TEXT_SECONDARY} />
                  <Text style={[styles.detailText, { color: theme.TEXT_SECONDARY }]}>
                    {stop.weather.wind_speed} m/s
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.recommendationsContainer}>
              {stop.recommendations.map((rec, recIndex) => (
                <View key={recIndex} style={styles.recommendationItem}>
                  <Ionicons name="checkmark-circle" size={16} color={isDarkMode ? '#FFD700' : theme.PRIMARY} />
                  <Text style={[styles.recommendationText, { color: theme.TEXT_SECONDARY }]}>{rec}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.continueButton, { backgroundColor: theme.PRIMARY }]}
        onPress={handleContinue}
      >
        <Text style={styles.continueButtonText}>Continue to Route</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 56,
    paddingBottom: 12,
    height: Platform.OS === 'ios' ? 100 : 116,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  weatherCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stopName: {
    fontSize: 16,
    fontWeight: '600',
  },
  weatherInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  temperature: {
    fontSize: 24,
    fontWeight: '700',
  },
  weatherDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  recommendationsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    flex: 1,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    margin: 16,
    borderRadius: 12,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  recommendationsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  recommendationsBannerText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
}); 