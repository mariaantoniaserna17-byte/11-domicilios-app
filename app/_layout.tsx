import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider } from '../context/SessionProvider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Iniciar sesión', headerShown: false }} />
          <Stack.Screen name="register" options={{ title: 'Crear cuenta', headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="producto/[id]" options={{ title: 'Detalle del plato' }} />
          <Stack.Screen name="checkout" options={{ title: 'Finalizar pedido' }} />
          <Stack.Screen name="pedido/[id]" options={{ title: 'Seguimiento' }} />
        </Stack>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
