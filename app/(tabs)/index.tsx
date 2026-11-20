import { Link, router } from 'expo-router';
import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { addCartItem, getCachedProducts, ProductCache, saveProductCache } from '../../services/database';
import { Button, colors, Screen, styles } from '../../components/ui';
import { useSession } from '../../context/SessionProvider';

const sampleProducts: ProductCache[] = [
  {
    id: 'sample-burger',
    nombre: 'Hamburguesa de la casa',
    precioCentavos: 2800000,
    categoria: 'Comidas',
    fotoUrl:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    disponible: true,
  },
  {
    id: 'sample-pizza',
    nombre: 'Pizza napolitana',
    precioCentavos: 3200000,
    categoria: 'Comidas',
    fotoUrl:
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
    disponible: true,
  },
  {
    id: 'sample-lemonade',
    nombre: 'Limonada natural',
    precioCentavos: 900000,
    categoria: 'Bebidas',
    fotoUrl:
      'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=800',
    disponible: true,
  },
  {
  id: 'sample-tacos',
  nombre: 'Tacos mexicanos',
  precioCentavos: 2000000,
  categoria: 'Comidas',
  fotoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSXbuOuEaneB_EzE6r_zyGK5OucibBxapPZEp-UWsMAQ&s=10',
  disponible: true,
},
{
    id: 'bandeja-paisa-miniatura',
    nombre: 'Bandeja paisa miniatura',
    precioCentavos: 2200000,
    categoria: 'Comidas',
    fotoUrl: 'https://i.blogs.es/bb0cca/bandeja_paisa/450_1000.jpg',
    disponible: true,
  },
  {
    id: 'empanadas-caseras',
    nombre: 'Empanadas caseras',
    precioCentavos: 450000,
    categoria: 'Comidas',
    fotoUrl: 'https://www.empanadasdelujo.com/img_products/catalogo-real-v1/CAT-001-approved-v2.jpg',
    disponible: true,
  },
  {
    id: 'patacon-con-todo',
    nombre: 'Patacón con todo',
    precioCentavos: 1600000,
    categoria: 'Comidas',
    fotoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTu8BN3nk2sTZLRkR41mRG70P-WAuiWrMRzKHn8UqhSTDoQHm7YSpZqpyDL&s=10',
    disponible: true,
  },
  {
    id: 'jugo-lulo-leche',
    nombre: 'Jugo de lulo en leche',
    precioCentavos: 600000,
    categoria: 'Bebidas',
    fotoUrl: 'https://cdn.1-klick.com/dlk.inoutdelivery.com/lg/1756836865564-lulo%20en%20lecheLOW.jpg',
    disponible: true,
  },
  {
    id: 'salchipapa-artesanal',
    nombre: 'Salchipapa artesanal',
    precioCentavos: 1200000,
    categoria: 'Comidas',
    fotoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsefnbRuUkbTKMBbtdoyiTAj4ZmWcL0rG4r9bg9x2Gm2zi-zy08gmkHTla&s=10',
    disponible: true,
  },

];

const categoryEmoji: Record<string, string> = {
  Comidas: '🍽️',
  Bebidas: '🍋',
};

const formatPrice = (priceInCents: number) =>
  `$${Math.round(priceInCents / 100).toLocaleString('es-CO')}`;

export default function MenuScreen() {
  const { session, signOut } = useSession();
  const [products, setProducts] = useState<ProductCache[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewProduct, setPreviewProduct] = useState<ProductCache | null>(null);

  const loadProducts = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      await saveProductCache(sampleProducts);
      const cachedProducts = await getCachedProducts();

      setProducts(cachedProducts);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No fue posible cargar el menú local.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const categories = useMemo(
    () => ['Todos', ...new Set(products.map((product) => product.categoria))],
    [products],
  );

  const visibleProducts = useMemo(
    () =>
      selectedCategory === 'Todos'
        ? products
        : products.filter((product) => product.categoria === selectedCategory),
    [products, selectedCategory],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Quieres salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            signOut();
            router.replace('/login');
          },
        },
      ],
    );
  };

  const handleAddToCart = async (product: ProductCache) => {
    if (!product.disponible) {
      return;
    }

    setAddingProductId(product.id);
    setError(null);

    try {
      await addCartItem(product.id);
      setAddedProductId(product.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (addError) {
      setError(
        addError instanceof Error
          ? addError.message
          : 'No fue posible agregar el producto al carrito.',
      );
    } finally {
      setAddingProductId(null);
    }
  };

  return (
    <Screen>
      <FlatList
        data={visibleProducts}
        keyExtractor={(product) => product.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListHeaderComponent={
          <View>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={styles.eyebrow}>
                DOMICILIOS • {session?.address || 'Elige una dirección'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar sesión"
                onPress={handleLogout}
                style={({ pressed }) => [
                  {
                    backgroundColor: '#FFF0E8',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={{ color: colors.primaryDark, fontWeight: '800' }}>
                  Salir
                </Text>
              </Pressable>
            </View>
            <Text style={styles.title}>Hola, {session?.name ?? 'amigo'} 👋</Text>
            <Text style={styles.subtitle}>¿Qué se te antoja pedir hoy?</Text>
            <FlatList
              data={categories}
              horizontal
              keyExtractor={(category) => category}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 24 }}
              renderItem={({ item: category }) => {
                const isSelected = selectedCategory === category;

                return (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedCategory(category)}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected ? '#FFFFFF' : colors.muted,
                        fontWeight: '700',
                      }}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              }}
            />
            <Text style={styles.sectionTitle}>Favoritos de la casa</Text>
            {error ? (
              <View
                style={[
                  styles.card,
                  { backgroundColor: '#FFF0E8', marginBottom: 16 },
                ]}
              >
                <Text style={{ color: colors.primaryDark, fontWeight: '700' }}>
                  {error}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <Button label="Reintentar" onPress={() => void loadProducts()} variant="secondary" />
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
                Cargando el menú...
              </Text>
            </View>
          ) : (
            <Text style={styles.subtitle}>No hay productos en esta categoría.</Text>
          )
        }
        renderItem={({ item: product }) => (
          <ProductGestures
            onDouble={() => void handleAddToCart(product)}
            onLong={() => {
              setPreviewProduct(product);
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
          <View style={[styles.card, { marginBottom: 12 }]}>
            <Link
              href={{ pathname: '/producto/[id]', params: { id: product.id } }}
              asChild
            >
              <Pressable style={{ flexDirection: 'row' }}>
                {product.fotoUrl ? (
                  <Image
                    accessibilityLabel={`Foto de ${product.nombre}`}
                    source={{ uri: product.fotoUrl }}
                    style={{
                      backgroundColor: colors.border,
                      borderRadius: 14,
                      height: 88,
                      marginRight: 14,
                      width: 88,
                    }}
                  />
                ) : (
                  <Text style={{ fontSize: 48, marginRight: 14 }}>
                    {categoryEmoji[product.categoria] ?? '🍽️'}
                  </Text>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>
                    {product.nombre}
                  </Text>
                  <Text style={styles.subtitle}>{product.categoria}</Text>
                  <Text
                    style={{
                      color: colors.primaryDark,
                      fontSize: 16,
                      fontWeight: '800',
                      marginTop: 8,
                    }}
                  >
                    {formatPrice(product.precioCentavos)}
                  </Text>
                </View>
                <Text style={{ color: colors.primary, fontSize: 24 }}>›</Text>
              </Pressable>
            </Link>
            <View style={{ marginTop: 12 }}>
              <Button
                label={
                  addingProductId === product.id
                    ? 'Agregando...'
                    : addedProductId === product.id
                      ? 'Agregado al carrito'
                      : product.disponible
                        ? 'Agregar al carrito'
                        : 'No disponible'
                }
                onPress={() => void handleAddToCart(product)}
                variant={addedProductId === product.id ? 'secondary' : 'primary'}
              />
            </View>
          </View>
          </ProductGestures>
        )}
      />
      <Modal
        transparent
        animationType="fade"
        visible={previewProduct !== null}
        onRequestClose={() => setPreviewProduct(null)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar vista previa"
          onPress={() => setPreviewProduct(null)}
          style={{
            alignItems: 'center',
            backgroundColor: 'rgba(41,34,29,0.55)',
            flex: 1,
            justifyContent: 'center',
            padding: 24,
          }}
        >
          {previewProduct ? (
            <View style={[styles.card, { width: '100%' }]}>
              <Text style={styles.title}>{previewProduct.nombre}</Text>
              <Text style={[styles.subtitle, { marginTop: 12 }]}>
                {previewProduct.categoria} · {formatPrice(previewProduct.precioCentavos)}
              </Text>
              <Text style={[styles.subtitle, { marginTop: 8 }]}>
                Vista rápida del plato. Usa el botón para añadirlo al carrito.
              </Text>
              <View style={{ marginTop: 16 }}>
                <Button
                  label="Agregar una unidad"
                  onPress={() => {
                    void handleAddToCart(previewProduct);
                    setPreviewProduct(null);
                  }}
                />
              </View>
              <View style={{ marginTop: 10 }}>
                <Button label="Cerrar" onPress={() => setPreviewProduct(null)} variant="secondary" />
              </View>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}

function ProductGestures({
  children,
  onDouble,
  onLong,
}: PropsWithChildren<{ onDouble: () => void; onLong: () => void }>) {
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => runOnJS(onDouble)());
  const longPress = Gesture.LongPress()
    .minDuration(550)
    .onStart(() => runOnJS(onLong)());
  const gestures = Gesture.Exclusive(longPress, doubleTap);

  return (
    <GestureDetector gesture={gestures}>
      <Animated.View>{children}</Animated.View>
    </GestureDetector>
  );
}
