import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  View,
} from 'react-native';
import {
  getLocalOrders,
  LocalOrder,
  registerLocalOrder,
  updateLocalOrderStatus,
} from '../../services/database';
import { cancelRemoteOrder, getRemoteOrders } from '../../services/api';
import { useSession } from '../../context/SessionProvider';
import { Button, colors, Screen, styles } from '../../components/ui';

const formatPrice = (priceInCents: number) =>
  `$${Math.round(priceInCents / 100).toLocaleString('es-CO')}`;

const formatDate = (date: string | undefined) => {
  if (!date) {
    return 'Fecha no disponible';
  }

  const parsedDate = new Date(date);

  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleString('es-CO', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
};

const statusColor = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === 'entregado') {
    return colors.success;
  }

  if (normalizedStatus === 'cancelado') {
    return colors.primaryDark;
  }

  return colors.primary;
};

export default function OrdersScreen() {
  const { session } = useSession();
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      if (!session?.id) {
        setOrders([]);
        return;
      }

      const localOrders = await getLocalOrders(session.id);

      if (session?.token) {
        try {
          const remoteOrders = await getRemoteOrders(session.token);
          for (const remoteOrder of remoteOrders) {
            await registerLocalOrder({
              id: remoteOrder.id,
              userId: session.id,
              estado: remoteOrder.estado,
              totalCentavos: remoteOrder.totalCentavos,
              direccion: remoteOrder.direccion,
              lat: remoteOrder.lat,
              lng: remoteOrder.lng,
              notas: remoteOrder.notas ?? null,
              creadoEn: remoteOrder.creadoEn,
            });
          }
          setOrders(await getLocalOrders(session.id));
          return;
        } catch {
          setOrders(localOrders);
          return;
        }
      }

      setOrders(localOrders);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar el historial local.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, [loadOrders]);

  const handleCancel = async (orderId: string) => {
    if (!session?.token) {
      setError('Inicia sesión nuevamente para cancelar el pedido.');
      return;
    }

    setCancelingId(orderId);
    setError(null);

    try {
      await cancelRemoteOrder(session.token, orderId);
      await updateLocalOrderStatus(orderId, session.id, 'cancelado');
      await loadOrders();
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : 'No fue posible cancelar el pedido.',
      );
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <Screen>
      <FlatList
        data={orders}
        keyExtractor={(order) => order.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>HISTORIAL</Text>
            <Text style={styles.title}>Mis pedidos</Text>
            <Text style={styles.subtitle}>
              Consulta el estado y los detalles de tus pedidos locales.
            </Text>
            {error ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: '#FFF0E8', marginTop: 20 },
                ]}
              >
                <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>
                  {error}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <Button
                    label="Reintentar"
                    onPress={() => void loadOrders()}
                    variant="secondary"
                  />
                </View>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 36 }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.subtitle, { marginTop: 10 }]}>
                Cargando pedidos...
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { marginTop: 20 }]}>
              <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>
                Todavía no tienes pedidos
              </Text>
              <Text style={styles.subtitle}>
                Cuando confirmes una compra aparecerá aquí.
              </Text>
            </View>
          )
        }
        renderItem={({ item: order }) => (
          <View style={[styles.card, { marginTop: 12 }]}>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>
                Pedido #{order.id}
              </Text>
              <Text
                style={{
                  color: statusColor(order.estado),
                  fontWeight: '800',
                  textTransform: 'capitalize',
                }}
              >
                {order.estado}
              </Text>
            </View>
            <Text style={[styles.subtitle, { marginTop: 10 }]}>
              {formatDate(order.creadoEn)}
            </Text>
            <View style={{ gap: 8, marginTop: 14 }}>
              <DetailRow label="Total" value={formatPrice(order.totalCentavos)} strong />
              <DetailRow label="Entrega" value={order.direccion} />
              {order.notas ? <DetailRow label="Notas" value={order.notas} /> : null}
            </View>
            <View style={{ marginTop: 16 }}>
              <Button
                label="Ver seguimiento"
                onPress={() =>
                  router.push({
                    pathname: '/pedido/[id]',
                    params: { id: order.id },
                  })
                }
                variant="secondary"
              />
              {order.estado.toLowerCase() === 'recibido' ? (
                <View style={{ marginTop: 10 }}>
                  <Button
                    label={
                      cancelingId === order.id
                        ? 'Cancelando pedido...'
                        : 'Cancelar pedido'
                    }
                    onPress={() =>
                      Alert.alert(
                        'Cancelar pedido',
                        '¿Quieres cancelar este pedido mientras está recibido?',
                        [
                          { text: 'No', style: 'cancel' },
                          {
                            text: 'Sí, cancelar',
                            style: 'destructive',
                            onPress: () => void handleCancel(order.id),
                          },
                        ],
                      )
                    }
                    variant="secondary"
                  />
                </View>
              ) : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

function DetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text
        style={{
          color: colors.muted,
          fontSize: strong ? 15 : 14,
          fontWeight: '600',
        }}
      >
        {label}:
      </Text>
      <Text
        style={{
          color: colors.ink,
          flex: 1,
          fontSize: strong ? 17 : 14,
          fontWeight: strong ? '800' : '500',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
