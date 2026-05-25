import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../../features/timetable/HomeScreen';
import PDFImportScreen from '../../features/timetable/PDFImportScreen';
import AttendanceScreen from '../../features/attendance/AttendanceScreen';
import SettingsScreen from '../../features/settings/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  PDFImport: undefined;
  Attendance: { batch: string; groupName?: string; subject: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="PDFImport" component={PDFImportScreen} />
        <Stack.Screen name="Attendance" component={AttendanceScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
