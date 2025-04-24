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
    </Stack>
  );
} 