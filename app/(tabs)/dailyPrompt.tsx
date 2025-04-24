import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/authContext';

export default function DailyPrompt() {
  const router = useRouter();
  const { user: session } = useAuth();
  const [selectedOption, setSelectedOption] = useState<'yes' | 'no' | null>(null);

  const handleResponse = async (response: 'yes' | 'no') => {
    setSelectedOption(response);

    // Save response to database
    const { error } = await supabase
      .from('student_daily_attendance')
      .upsert({
        student_id: session?.user?.id,
        date: new Date().toISOString().split('T')[0],
        is_coming: response === 'yes',
      });

    if (error) {
      console.error('Error saving attendance:', error);
      return;
    }

    // Navigate based on response
    if (response === 'yes') {
      router.push('/bustracking');
    } else {
      // Show message for 'no' response
      alert('See you tomorrow! Have a great day!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Attendance</Text>
      <Text style={styles.question}>Are you coming to college today?</Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[styles.option, selectedOption === 'yes' && styles.selectedOption]}
          onPress={() => handleResponse('yes')}
          disabled={selectedOption !== null}
        >
          <Text style={styles.optionText}>Yes, I'm coming! 🚌</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, selectedOption === 'no' && styles.selectedOption]}
          onPress={() => handleResponse('no')}
          disabled={selectedOption !== null}
        >
          <Text style={styles.optionText}>Not today 😢</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  question: {
    fontSize: 22,
    marginBottom: 40,
    color: '#666',
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 20,
  },
  option: {
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#4CAF50',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  }
}); 