import { Tabs } from 'expo-router';
import { Globe, Video } from 'lucide-react-native';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'FMEO Jams',
          tabBarIcon: ({ color, size }) => <Globe size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="video"
        options={{
          title: 'AI Video',
          tabBarIcon: ({ color, size }) => <Video size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
