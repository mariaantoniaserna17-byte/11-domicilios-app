import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { colors, Screen, styles } from '../../components/ui';
import { getLocalOrders, LocalOrder } from '../../services/database';
import { useSession } from '../../context/SessionProvider';
import { advanceRemoteOrder, getRemoteOrders } from '../../services/api';
import { Button } from '../../components/ui';

const steps = ['Pedido recibido', 'En preparación', 'En camino', 'Entregado'];

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const [order, setOrder] = useState<LocalOrder | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadOrder = async () => {
      const localOrders = session?.id
        ? await getLocalOrders(session.id)
        : [];
      let found = localOrders.find((item) => item.id === id) ?? null;

      if (session?.token) {
        try {
          const remoteOrders = await getRemoteOrders(session.token);
          const remoteOrder = remoteOrders.find((item) => item.id === id);
          if (remoteOrder) {
            found = {
              id: remoteOrder.id,
              userId: session.id,
              estado: remoteOrder.estado,
              totalCentavos: remoteOrder.totalCentavos,
              direccion: remoteOrder.direccion,
              lat: remoteOrder.lat,
              lng: remoteOrder.lng,
              notas: remoteOrder.notas ?? null,
              creadoEn: remoteOrder.creadoEn,
            };
          }
        } catch {
          // Keep the locally cached order if remote access is unavailable.
        }
      }

      if (active) {
        setOrder(found);
      }
    };

    void loadOrder();
    const refresh = setInterval(() => {
      void loadOrder();
    }, 10000);

    return () => {
      active = false;
      clearInterval(refresh);
    };
  }, [id, session?.token]);

  const handleAdvance = async () => {
    if (!session?.token || !order) {
      return;
    }

    setAdvancing(true);
    setError(null);
    try {
      const updated = await advanceRemoteOrder(session.token, order.id);
      setOrder((current) =>
        current
          ? {
              ...current,
              estado: updated.estado,
              totalCentavos: updated.totalCentavos,
              direccion: updated.direccion,
              lat: updated.lat,
              lng: updated.lng,
              notas: updated.notas,
              creadoEn: updated.creadoEn,
            }
          : current,
      );
    } catch (advanceError) {
      setError(
        advanceError instanceof Error
          ? advanceError.message
          : 'No fue posible actualizar el estado del pedido.',
      );
    } finally {
      setAdvancing(false);
    }
  };

  const normalizedStatus = order?.estado?.toLowerCase() ?? 'recibido';
  const statusIndex =
    normalizedStatus === 'recibido'
      ? 0
      : normalizedStatus === 'preparando'
        ? 1
        : normalizedStatus === 'en_camino'
          ? 2
          : normalizedStatus === 'entregado'
            ? 3
            : -1;
  const statusTitle =
    normalizedStatus === 'cancelado'
      ? 'Pedido cancelado'
      : normalizedStatus === 'entregado'
        ? 'Pedido entregado'
        : normalizedStatus === 'en_camino'
          ? 'En camino'
          : normalizedStatus === 'preparando'
            ? 'En preparación'
            : 'Pedido recibido';

  return (
    <Screen>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>PEDIDO #{id}</Text>
        <Text style={styles.title}>{statusTitle}</Text>
        <Text style={styles.subtitle}>Estado actualizado del pedido.</Text>
        {error ? (
          <View style={[styles.card, { backgroundColor: '#FFF0E8', marginTop: 16 }]}>
            <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>
              {error}
            </Text>
          </View>
        ) : null}
        <View style={[styles.card, { marginTop: 28, gap: 20 }]}>
          {steps.map((step, index) => (
            <View key={step} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ alignItems: 'center', backgroundColor: statusIndex >= index ? colors.primary : colors.border, borderRadius: 20, height: 28, justifyContent: 'center', width: 28 }}><Text style={{ color: statusIndex >= index ? '#FFFFFF' : colors.muted, fontWeight: '800' }}>{statusIndex >= index ? '✓' : index + 1}</Text></View>
              <Text style={{ color: statusIndex >= index ? colors.ink : colors.muted, fontSize: 16, fontWeight: index === statusIndex ? '800' : '600', marginLeft: 12 }}>{step}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.card, { marginTop: 16, backgroundColor: '#FFF0E8' }]}>
          <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>Dirección de entrega</Text>
          <Text style={styles.subtitle}>{order?.direccion ?? 'Dirección no disponible'}</Text>
        </View>
        {order &&
        session?.token &&
        ['recibido', 'preparando', 'en_camino'].includes(normalizedStatus) ? (
          <View style={{ marginTop: 16 }}>
            <Button
              label={advancing ? 'Actualizando estado...' : 'Simular siguiente estado'}
              onPress={() => void handleAdvance()}
              variant="secondary"
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
