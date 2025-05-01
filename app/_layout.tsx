import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function AppLayout() {
  const router = useRouter();

  const handleBackPress = () => {
    router.push('/01home');
  };

  return (
    <Stack>
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="01home" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="02driverlocation" 
        options={{ 
          title: 'Bus Location',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackPress} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitleStyle: {
            color: '#000',
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="03busroute" 
        options={{ 
          title: 'Bus Route',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackPress} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitleStyle: {
            color: '#000',
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="04Locshare" 
        options={{ 
          title: 'Share Location',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackPress} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitleStyle: {
            color: '#000',
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="05selectbus" 
        options={{ 
          title: 'Select Bus',
          headerLeft: () => (
            <TouchableOpacity onPress={handleBackPress} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTitleStyle: {
            color: '#000',
            fontWeight: 'bold',
          },
        }} 
      />
      <Stack.Screen 
        name="06login" 
        options={{ 
          headerShown: false 
        }} 
      />
      {/* Admin Routes */}
      <Stack.Screen 
        name="admin/login" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="admin/dashboard" 
        options={{ 
          headerShown: false 
        }} 
      />
      {/* King Dashboard Route */}
      <Stack.Screen 
        name="king/dashboard" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}
