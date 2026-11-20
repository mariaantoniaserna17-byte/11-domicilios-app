import { router } from 'expo-router';
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  addCartItem,
  CartItem,
  getCachedProducts,
  getCartItems,
  ProductCache,
  removeCartItem,
} from '../../services/database';
import { Button, colors, Screen, styles } from '../../components/ui';

const shippingCostCentavos = 500000;

type CartLine = {
  item: CartItem;
  product: ProductCache;
};

const categoryEmoji: Record<string, string> = {
  Hamburguesas: '🍔',
  Pizzas: '🍕',
  Bebidas: '🍋',
};

const formatPrice = (priceInCents: number) =>
  `$${Math.round(priceInCents / 100).toLocaleString('es-CO')}`;

export default function CartScreen() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const [cartItems, cachedProducts] = await Promise.all([
        getCartItems(),
        getCachedProducts(),
      ]);
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

      setLines(
        cartItems.map((item) => ({
          item,
          product: productsById.get(item.productoId) as ProductCache,
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar el carrito local.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const subtotalCentavos = useMemo(
    () =>
      lines.reduce(
        (total, line) =>
          total + line.product.precioCentavos * line.item.cantidad,
        0,
      ),
    [lines],
  );
  const totalCentavos =
    subtotalCentavos > 0 ? subtotalCentavos + shippingCostCentavos : 0;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCart();
    setRefreshing(false);
  }, [loadCart]);

  const updateQuantity = async (productId: string, quantityChange: number) => {
    const line = lines.find(({ item }) => item.productoId === productId);

    if (!line) {
      return;
    }

    setUpdatingProductId(productId);
    setError(null);

    try {
      if (quantityChange > 0) {
        await addCartItem(productId, quantityChange);
      } else {
        await removeCartItem(productId, Math.abs(quantityChange));
      }
      await loadCart();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'No fue posible actualizar el carrito.',
      );
    } finally {
      setUpdatingProductId(null);
    }
  };

  return (
    <Screen>
      <FlatList
        data={lines}
        keyExtractor={({ item }) => item.id.toString()}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <View>
            <Text style={styles.eyebrow}>TU PEDIDO</Text>
            <Text style={styles.title}>Carrito</Text>
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
                    onPress={() => void loadCart()}
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
                Cargando tu carrito...
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { marginTop: 20 }]}>
              <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>
                Tu carrito está vacío
              </Text>
              <Text style={styles.subtitle}>
                Agrega un plato desde el menú para comenzar tu pedido.
              </Text>
            </View>
          )
        }
        renderItem={({ item: line }) => {
          const isUpdating = updatingProductId === line.item.productoId;
          const lineTotalCentavos =
            line.product.precioCentavos * line.item.cantidad;

          return (
            <CartSwipeRow
              key={line.item.id}
              onRemove={() =>
                void updateQuantity(line.item.productoId, -line.item.cantidad)
              }
              disabled={isUpdating}
            >
              <View style={[styles.card, { marginTop: 12 }]}>
              <View style={{ flexDirection: 'row' }}>
                {line.product.fotoUrl ? (
                  <Image
                    accessibilityLabel={`Foto de ${line.product.nombre}`}
                    source={{ uri: line.product.fotoUrl }}
                    style={{
                      backgroundColor: colors.border,
                      borderRadius: 14,
                      height: 82,
                      marginRight: 14,
                      width: 82,
                    }}
                  />
                ) : (
                  <Text style={{ fontSize: 44, marginRight: 14 }}>
                    {categoryEmoji[line.product.categoria] ?? '🍽️'}
                  </Text>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>
                    {line.product.nombre}
                  </Text>
                  <Text style={styles.subtitle}>
                    {formatPrice(line.product.precioCentavos)} por unidad
                  </Text>
                  <Text
                    style={{
                      color: colors.primaryDark,
                      fontSize: 16,
                      fontWeight: '800',
                      marginTop: 8,
                    }}
                  >
                    Subtotal: {formatPrice(lineTotalCentavos)}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  marginTop: 16,
                }}
              >
                <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12 }}>
                  <QuantityButton
                    label="−"
                    onPress={() => void updateQuantity(line.item.productoId, -1)}
                    disabled={isUpdating}
                  />
                  <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>
                    {line.item.cantidad}
                  </Text>
                  <QuantityButton
                    label="+"
                    onPress={() => void updateQuantity(line.item.productoId, 1)}
                    disabled={isUpdating}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={isUpdating}
                  onPress={() =>
                    void updateQuantity(
                      line.item.productoId,
                      -line.item.cantidad,
                    )
                  }
                >
                  <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>
                    Eliminar
                  </Text>
                </Pressable>
              </View>
              </View>
            </CartSwipeRow>
          );
        }}
        ListFooterComponent={
          lines.length > 0 ? (
            <View style={[styles.card, { marginTop: 16 }]}>
              <View style={{ gap: 12 }}>
                <Row label="Subtotal" value={formatPrice(subtotalCentavos)} />
                <Row
                  label="Domicilio"
                  value={formatPrice(shippingCostCentavos)}
                />
                <View
                  style={{
                    borderTopColor: colors.border,
                    borderTopWidth: 1,
                    paddingTop: 12,
                  }}
                >
                  <Row label="Total" value={formatPrice(totalCentavos)} strong />
                </View>
              </View>
              <View style={{ marginTop: 20 }}>
                <Button
                  label="Proceder al Checkout"
                  onPress={() => router.push('/checkout')}
                />
              </View>
            </View>
          ) : undefined
        }
      />
    </Screen>
  );
}

function QuantityButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Incrementar cantidad' : 'Disminuir cantidad'}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          backgroundColor: '#FFF0E8',
          borderRadius: 10,
          height: 36,
          justifyContent: 'center',
          width: 36,
        },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={{ color: colors.primaryDark, fontSize: 22, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Row({
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

function CartSwipeRow({
  children,
  onRemove,
  disabled,
}: PropsWithChildren<{ onRemove: () => void; disabled: boolean }>) {
  const translationX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translationX.value }],
  }));
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translationX.value = Math.max(event.translationX, -140);
      }
    })
    .onEnd((event) => {
      if (event.translationX < -90) {
        translationX.value = withTiming(-500, { duration: 180 });
        runOnJS(onRemove)();
      } else {
        translationX.value = withTiming(0);
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
