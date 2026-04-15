import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<void> {
  if (!Device.isDevice) return; // skip in simulator

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('checkins', {
      name: 'Daily check-in',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // getDevicePushTokenAsync returns native FCM (Android) / APNs (iOS) token
  // Works in development builds; skipped in Expo Go
  let fcmToken: string | null = null;
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    fcmToken = token.data as string;
  } catch {
    console.log('[notifications] Could not get device push token — running in Expo Go?');
    return;
  }

  await api.post('/devices', {
    fcmToken,
    platform: Platform.OS as 'ios' | 'android',
  }).catch(() => {
    // non-fatal — will retry on next app open
  });
}
