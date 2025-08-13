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
    <Stack.Navigator>
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ title: 'Fuel Records' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'Profile' }}
      />
      <Stack.Screen 
        name="FuelRecord" 
        component={FuelRecordScreen} 
        options={{ title: 'Add Fuel Record' }}
      />
    </Stack.Navigator>
  );
}
