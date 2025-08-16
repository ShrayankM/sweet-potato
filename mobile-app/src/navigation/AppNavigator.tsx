import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FuelRecordScreen from '../screens/FuelRecordScreen';
import FuelRecordDetailScreen from '../screens/FuelRecordDetailScreen';

export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  FuelRecord: undefined;
  FuelRecordDetail: { recordId: number };
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
      <Stack.Screen 
        name="FuelRecordDetail" 
        component={FuelRecordDetailScreen} 
        options={{ headerShown: true, title: 'Fuel Record Details' }}
      />
    </Stack.Navigator>
  );
}
