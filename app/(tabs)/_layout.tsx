import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="01home" />
      <Stack.Screen name="02login" />
      <Stack.Screen name="03selectbus" />
      <Stack.Screen name="04busroute" />
    </Stack>
  );
}
