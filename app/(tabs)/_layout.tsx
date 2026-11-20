import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../components/ui';
import { useSession } from '../../context/SessionProvider';

export default function TabsLayout() {
  const { session } = useSession();

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: colors.border },
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Menú', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⌂</Text> }} />
      <Tabs.Screen name="carrito" options={{ title: 'Carrito', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🛒</Text> }} />
      <Tabs.Screen name="pedidos" options={{ title: 'Pedidos', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>◷</Text> }} />
    </Tabs>
  );
}
