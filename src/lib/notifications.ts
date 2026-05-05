/**
 * Mock Notification Service for Expo Compatibility
 * In a real Expo environment, you would use 'expo-notifications'
 */

import { Alert, Platform } from 'react-native';

export const registerForPushNotificationsAsync = async () => {
  console.log('Registering for push notifications (Mock)');
  return 'mock-expo-token';
};

export const sendLocalNotification = async (title: string, body: string) => {
  console.log(`Notification: ${title} - ${body}`);
  
  if (Platform.OS === 'web') {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(title, { body });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, { body });
          }
        });
      }
    }
  } else {
    // Native Alert as fallback for local notifications in this simple mock
    Alert.alert(title, body);
  }
};
