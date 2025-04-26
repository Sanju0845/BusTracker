import { Stack } from 'expo-router';

export default function DriverLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="01driverselectbus"
        options={{
          headerShown: false,
          title: 'Select Bus',
        }}
      />
      <Stack.Screen
        name="04Locshare"
        options={{
          headerShown: false,
          title: 'Location Sharing',
        }}
      />
    </Stack>
  );
} 