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

  // getExpoPushTokenAsync requires a valid EAS projectId — skip in local dev
  let fcmToken: string | null = null;
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    fcmToken = token.data;
  } catch {
    // No EAS project configured — push notifications won't work locally
    // Will be set up when deploying to staging/production
    console.log('[notifications] Skipping push token — EAS project not configured');
    return;
  }

  await api.post('/devices', {
    fcmToken,
    platform: Platform.OS as 'ios' | 'android',
  }).catch(() => {
    // non-fatal — will retry on next app open
  });
}
