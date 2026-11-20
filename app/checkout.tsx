import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import {
  clearCart,
  getCachedProducts,
  getCartItems,
  ProductCache,
  registerLocalOrder,
  CartItem,
} from '../services/database';
import { createRemoteOrder } from '../services/api';
import { Button, colors, Screen, styles } from '../components/ui';
import { useSession } from '../context/SessionProvider';

const shippingCostCentavos = 500000;
const shippingCostFallbackPerKmCentavos = 50000;
const restaurantLocation = { lat: 6.2442, lng: -75.5812 };

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const formatPrice = (priceInCents: number) =>
  `$${Math.round(priceInCents / 100).toLocaleString('es-CO')}`;

export default function CheckoutScreen() {
  const { session } = useSession();
  const [address, setAddress] = useState(session?.address ?? '');
  const [notes, setNotes] = useState('');
  const [subtotalCentavos, setSubtotalCentavos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [serverShippingCentavos, setServerShippingCentavos] = useState<number | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadOrderSummary = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const [cartItems, cachedProducts] = await Promise.all([
        getCartItems(),
        getCachedProducts(),
      ]);
      setCartItems(cartItems);
      const productsById = new Map(
        cachedProducts.map((product) => [product.id, product]),
      );
      const missingProduct = cartItems.find(
        (item) => !productsById.has(item.productoId),
      );

      if (missingProduct) {
        throw new Error(
          `No se encontró el producto ${missingProduct.productoId} en la caché local.`,
        );
      }

      setSubtotalCentavos(
        cartItems.reduce((total, item) => {
          const product = productsById.get(item.productoId) as ProductCache;
          return total + product.precioCentavos * item.cantidad;
        }, 0),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar el resumen del pedido.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrderSummary();
  }, [loadOrderSummary]);

  const fallbackShippingCentavos = useMemo(() => {
    if (!lat || !lng || subtotalCentavos <= 0) {
      return shippingCostCentavos;
    }

    const distance = haversineDistanceKm(
      lat,
      lng,
      restaurantLocation.lat,
      restaurantLocation.lng,
    );
    if (distance > 8) {
      return -1;
    }

    return shippingCostCentavos + Math.ceil(distance) * shippingCostFallbackPerKmCentavos;
  }, [lat, lng, subtotalCentavos]);

  const shippingCentavos =
    serverShippingCentavos ?? (fallbackShippingCentavos >= 0 ? fallbackShippingCentavos : shippingCostCentavos);
  const totalCentavos =
    subtotalCentavos > 0 && fallbackShippingCentavos >= 0
      ? subtotalCentavos + shippingCentavos
      : 0;

  const handleUseLocation = async () => {
    setLoadingLocation(true);
    setError(null);

    try {
      const isAvailable = await Location.hasServicesEnabledAsync();
      if (!isAvailable) {
        throw new Error(
          'La ubicación no está disponible. Puedes escribir la dirección manualmente.',
        );
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          'Permiso de ubicación denegado. Puedes ingresar la dirección manualmente.',
        );
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextLat = position.coords.latitude;
      const nextLng = position.coords.longitude;

      const distance = haversineDistanceKm(
        nextLat,
        nextLng,
        restaurantLocation.lat,
        restaurantLocation.lng,
      );
      if (distance > 8) {
        setLat(null);
        setLng(null);
        throw new Error(
          'Tu ubicación GPS está fuera de la zona de cobertura de 8 km. Puedes escribir una dirección dentro de Medellín y convertirla con geocodificación.',
        );
      }

      setLat(nextLat);
      setLng(nextLng);

      const places = await Location.reverseGeocodeAsync({
        latitude: nextLat,
        longitude: nextLng,
      });
      const place = places[0];
      if (place) {
        setAddress(
          [place.street, place.streetNumber, place.district, place.city]
            .filter(Boolean)
            .join(', '),
        );
      }

      setServerShippingCentavos(null);
    } catch (locationError) {
      setError(
        locationError instanceof Error
          ? locationError.message
          : 'No fue posible obtener la ubicación.',
      );
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleConfirmOrder = async () => {
    const trimmedAddress = address.trim();

    if (!trimmedAddress) {
      setError('Ingresa una dirección de entrega para continuar.');
      return;
    }

    if (subtotalCentavos <= 0) {
      setError('Agrega al menos un producto antes de confirmar el pedido.');
      return;
    }

    let deliveryLat = lat;
    let deliveryLng = lng;

    if (deliveryLat === null || deliveryLng === null) {
      try {
        const locations = await Location.geocodeAsync(trimmedAddress);
        if (locations[0]) {
          deliveryLat = locations[0].latitude;
          deliveryLng = locations[0].longitude;
        }
      } catch {
        deliveryLat = null;
        deliveryLng = null;
      }
    }

    if (deliveryLat === null || deliveryLng === null) {
      setError(
        'Necesitamos coordenadas para calcular el envío. Usa “Usar mi ubicación” o prueba una dirección más específica.',
      );
      return;
    }

    const distance = haversineDistanceKm(
      deliveryLat,
      deliveryLng,
      restaurantLocation.lat,
      restaurantLocation.lng,
    );
    if (distance > 8) {
      setError(
        'Estás fuera de la zona de cobertura de 8 km. Cambia la dirección de entrega.',
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    const orderId = `pedido-${Date.now()}`;

    try {
      if (!session?.token) {
        throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
      }

      const remoteOrder = await createRemoteOrder(
        session.token,
        {
          address: trimmedAddress,
          lat: deliveryLat,
          lng: deliveryLng,
          notes: notes.trim() || null,
          items: cartItems.map((item) => ({
            productoId: item.productoId,
            cantidad: item.cantidad,
          })),
        },
      );
      setServerShippingCentavos(remoteOrder.envioCentavos);

      await registerLocalOrder({
        id: remoteOrder.id,
        userId: session.id,
        estado: remoteOrder.estado,
        totalCentavos: remoteOrder.totalCentavos,
        direccion: trimmedAddress,
        lat: deliveryLat,
        lng: deliveryLng,
        notas: notes.trim() || null,
      });
      await clearCart();
      router.replace({ pathname: '/pedido/[id]', params: { id: remoteOrder.id } });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'No fue posible registrar el pedido localmente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>ÚLTIMO PASO</Text>
        <Text style={styles.title}>Confirma tu pedido</Text>

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
                onPress={() => void loadOrderSummary()}
                variant="secondary"
              />
            </View>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
          Dirección de entrega
        </Text>
        <TextInput
          autoCapitalize="sentences"
          onChangeText={(value) => {
            setAddress(value);
            setLat(null);
            setLng(null);
            setServerShippingCentavos(null);
          }}
          placeholder="Calle y número"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          value={address}
        />
        <View style={{ marginTop: 12 }}>
          <Button
            label={
              loadingLocation
                ? 'Obteniendo ubicación...'
                : 'Usar mi ubicación actual'
            }
            onPress={() => void handleUseLocation()}
            variant="secondary"
          />
        </View>
        {lat !== null && lng !== null ? (
          <Text style={[styles.subtitle, { marginTop: 8 }]}>
            Ubicación seleccionada: {lat.toFixed(5)}, {lng.toFixed(5)}
          </Text>
        ) : null}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          Notas de entrega
        </Text>
        <TextInput
          multiline
          onChangeText={setNotes}
          placeholder="Ej. Dejar en portería"
          placeholderTextColor={colors.muted}
          style={[inputStyle, { minHeight: 92, textAlignVertical: 'top' }]}
          value={notes}
        />

        <View style={[styles.card, { marginTop: 20, gap: 12 }]}>
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>
            Resumen del pago
          </Text>
          {loading ? (
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              <SummaryRow
                label="Subtotal"
                value={formatPrice(subtotalCentavos)}
              />
              <SummaryRow
                label="Costo de envío"
                value={
                  fallbackShippingCentavos >= 0
                    ? formatPrice(shippingCentavos)
                    : 'Fuera de cobertura'
                }
              />
              <View
                style={{
                  borderTopColor: colors.border,
                  borderTopWidth: 1,
                  paddingTop: 12,
                }}
              >
                <SummaryRow
                  label="Total"
                  value={formatPrice(totalCentavos)}
                  strong
                />
              </View>
            </>
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          <Button
            label={submitting ? 'Registrando pedido...' : 'Confirmar pedido'}
            onPress={() => void handleConfirmOrder()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const inputStyle = {
  backgroundColor: colors.card,
  borderColor: colors.border,
  borderRadius: 14,
  borderWidth: 1,
  color: colors.ink,
  fontSize: 16,
  padding: 16,
};

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text
        style={{
          color: strong ? colors.ink : colors.muted,
          fontSize: strong ? 18 : 15,
          fontWeight: strong ? '800' : '500',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.ink,
          fontSize: strong ? 18 : 15,
          fontWeight: '800',
        }}
      >
        {value}
      </Text>
    </View>
  );
}
