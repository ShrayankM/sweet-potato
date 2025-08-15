import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FuelRecordScreen from '../screens/FuelRecordScreen';

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  FuelRecord: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ headerShown: true, title: 'Profile' }}
      />
      <Stack.Screen 
        name="FuelRecord" 
        component={FuelRecordScreen} 
        options={{ headerShown: true, title: 'Add Fuel Record' }}
      />
    </Stack.Navigator>
  );
}
