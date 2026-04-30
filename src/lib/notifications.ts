/**
 * Mock Notification Service for Expo Compatibility
 * In a real Expo environment, you would use 'expo-notifications'
 */

export const registerForPushNotificationsAsync = async () => {
  console.log('Registering for push notifications (Mock)');
  // Placeholder for Expo notification registration logic
  return 'mock-expo-token';
};

export const sendLocalNotification = async (title: string, body: string) => {
  console.log(`Notification: ${title} - ${body}`);
  
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
  } else if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, { body });
      }
    });
  }
};
