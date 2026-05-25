import React, { useEffect, useState } from 'react';
import { StatusBar, ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/database/sqlite/db';
import RootNavigator from './src/app/navigation/RootNavigator';
import { useAlarmStore } from './src/features/alarms/useAlarmStore';
import { AlarmScheduler } from './src/services/native/AlarmScheduler';
import { Theme } from './src/app/theme/theme';

export default function App() {
  const [dbLoaded, setDbLoaded] = useState<boolean>(false);
  const alarmStore = useAlarmStore();

  useEffect(() => {
    // 1. Initialize SQLite Database Tables
    const initDb = async () => {
      try {
        await initDatabase();
        setDbLoaded(true);
        
        // 2. Check if the app was launched because an alarm was triggered
        const trigger = await AlarmScheduler.getInitialAlarmTrigger();
        if (trigger && trigger.ringing) {
          console.log('App launched by ringing alarm ID:', trigger.alarmId);
          alarmStore.setActiveAlarm(trigger.alarmId);
        }
      } catch (e) {
        console.error('Failed to initialize database:', e);
      }
    };
    initDb();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
      {dbLoaded ? (
        <RootNavigator />
      ) : (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={Theme.colors.secondary} size="large" />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
