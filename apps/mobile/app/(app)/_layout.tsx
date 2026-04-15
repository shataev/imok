import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, icon: IoniconsName, iconOutline: IoniconsName) {
  return <Ionicons name={focused ? icon : iconOutline} size={24} />;
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerSafeAreaInsets: { top: undefined },
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'home', 'home-outline'),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'people', 'people-outline'),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'calendar', 'calendar-outline'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'settings', 'settings-outline'),
        }}
      />
    </Tabs>
  );
}
