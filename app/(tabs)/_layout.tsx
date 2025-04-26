import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="01home" 
        options={{ 
          headerShown: false,
          title: 'Home'
        }} 
      />
      <Stack.Screen 
        name="02login" 
        options={{ 
          headerShown: false,
          title: 'Login'
        }} 
      />
      <Stack.Screen 
        name="03selectbus" 
        options={{ 
          headerShown: false,
          title: 'Select Bus'
        }} 
      />
      <Stack.Screen 
        name="04busroute" 
        options={{ 
          headerShown: false,
          title: 'Bus Route'
        }} 
      />
      <Stack.Screen 
        name="02driverlocation" 
        options={{ 
          headerShown: false,
          title: 'Driver Location'
        }} 
      />
    </Stack>
  );
}
