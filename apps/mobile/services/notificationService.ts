// ============================================================
// BarberQ — Push Notification & Reminders Service
// Cross-platform push token registration, local on-device reminders,
// and notification handler configuration.
// ============================================================

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { Booking } from '@/types';

// Configure foreground presentation behavior
export function configureForegroundNotifications() {
  if (Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Register device for push notifications and persist in users.fcm_token
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('barberq-default', {
        name: 'BarberQ Appointments',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permissions not granted.');
      return null;
    }

    // Get Expo push token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;

    if (token && userId) {
      // Save in users table
      await supabase
        .from('users')
        .update({ fcm_token: token })
        .eq('id', userId);
    }

    return token;
  } catch (err) {
    console.warn('Could not register push token (likely running on emulator/unsupported device):', err);
    return null;
  }
}

// Schedule an on-device reminder 30 minutes before appointment
export async function scheduleLocalBookingReminder(booking: Booking): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const startTimeMs = new Date(booking.start_time).getTime();
    const reminderTimeMs = startTimeMs - 30 * 60 * 1000; // 30 mins before
    const nowMs = Date.now();

    // Only schedule if reminder time is in the future
    if (reminderTimeMs <= nowMs) {
      return null;
    }

    const triggerDate = new Date(reminderTimeMs);
    const timeFormatted = new Date(booking.start_time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Haircut in 30 Minutes! ⏰',
        body: `Your appointment for ${booking.service_name} starts at ${timeFormatted}. Please arrive 5 minutes early!`,
        data: {
          bookingId: booking.id,
          shopId: booking.shop_id,
          type: 'reminder_30m',
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  } catch (err) {
    console.warn('Failed to schedule local reminder:', err);
    return null;
  }
}
