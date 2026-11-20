import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { Button, colors, Screen, styles } from '../../components/ui';
import {
  addCartItem,
  getCachedProducts,
  ProductCache,
} from '../../services/database';

const productDetails: Record<
  string,
  { description: string; ingredients: string }
> = {
  'sample-burger': {
    description:
      'Hamburguesa preparada al momento con carne artesanal a la plancha, queso cheddar, vegetales frescos y salsa especial.',
    ingredients: 'Carne artesanal, queso cheddar, lechuga, tomate y pan.',
  },
  'sample-pizza': {
    description:
      'Pizza napolitana hecha con masa artesanal, salsa de tomate natural, mozzarella fresca y albahaca recién cortada.',
    ingredients: 'Masa artesanal, tomate, mozzarella y albahaca.',
  },
  'sample-lemonade': {
    description:
      'Limonada natural preparada al momento con limón fresco, agua, hielo y el punto exacto de dulzor.',
    ingredients: 'Limón fresco, agua, hielo y azúcar.',
  },
  'bandeja-paisa-miniatura': {
    description:
      'Nuestra versión compacta y tradicional de la tierra, servida con frijoles crujientes, arroz humeante, carne molida jugosa, chicharrón crocante y un huevo frito en su punto.',
    ingredients: 'Frijoles, arroz, carne molida, chicharrón, huevo frito, patacón y aguacate.',
  },
  'empanadas-caseras': {
    description:
      'Crujientes y doraditas por fuera, con una masa de maíz crocante que esconde un relleno jugoso de carne desmechada y papa criolla sazonada al estilo tradicional.',
    ingredients: 'Masa de maíz amarillo, carne desmechada, papa y hogao criollo.',
  },
  'patacon-con-todo': {
    description:
      'Un patacón gigante y crujiente cubierto con una mezcla perfecta de carne desmechada, pollo tierno, queso fundido y nuestro hogao de la casa.',
    ingredients: 'Plátano verde, carne desmechada, pollo, queso mozzarella y hogao.',
  },
  'jugo-lulo-leche': {
    description:
      'Refrescante y cremoso jugo de lulo recién licuado con leche condensada y un toque de hielo, logrando el equilibrio perfecto entre cítrico y dulce.',
    ingredients: 'Lulo fresco, leche, leche condensada y hielo.',
  },
  'salchipapa-artesanal': {
    description:
      'Cama de papas criollas y francesas doradas al punto, acompañadas de trozos de salchicha premium, queso costeño rallado y salsas artesanales de la casa.',
    ingredients: 'Papas mixtas, salchicha artesanal, queso costeño y salsa rosada.',
  },
  'sample-tacos': {
    description:
      'Tacos mexicanos con carne de res, cebolla, cilantro y salsa roja.',
    ingredients: 'Tortillas de maíz, carne de res, cebolla, cilantro y salsa roja.',
  },

};

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<ProductCache | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getCachedProducts()
      .then((products) => {
        if (!active) {
          return;
        }

        setProduct(products.find((item) => item.id === id) ?? null);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'No fue posible cargar el producto.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Screen>
        <View style={[styles.content, { alignItems: 'center', paddingTop: 80 }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.subtitle, { marginTop: 12 }]}>
            Cargando producto...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen>
        <View style={styles.content}>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={{ color: colors.primary, fontWeight: '800' }}>
              ‹ Volver al menú
            </Text>
          </Pressable>
          <View style={[styles.card, { marginTop: 24 }]}>
            <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>
              Producto no encontrado
            </Text>
            <Text style={styles.subtitle}>
              {error ?? 'Este producto no existe en la caché local.'}
            </Text>
          </View>
        </View>
      </Screen>
    );
  }

  const details = productDetails[product.id] ?? {
    description: `${product.nombre} pertenece a la categoría ${product.categoria} y está disponible para tu pedido.`,
    ingredients: 'Ingredientes preparados al momento.',
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} accessibilityRole="button"><Text style={{ color: colors.primary, fontWeight: '800' }}>‹ Volver al menú</Text></Pressable>
        <View style={[styles.card, { alignItems: 'center', marginTop: 24, paddingVertical: 32 }]}>
          {product.fotoUrl ? (
            <Image
              accessibilityLabel={`Foto de ${product.nombre}`}
              source={{ uri: product.fotoUrl }}
              resizeMode="cover"
              style={{
                backgroundColor: '#FFF0E8',
                borderRadius: 18,
                height: 220,
                width: '100%',
              }}
            />
          ) : (
            <View
              accessible
              accessibilityLabel={`Sin foto disponible para ${product.nombre}`}
              style={{
                alignItems: 'center',
                backgroundColor: '#FFF0E8',
                borderRadius: 18,
                height: 220,
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Text style={{ color: colors.muted, fontWeight: '700' }}>
                Sin foto disponible
              </Text>
            </View>
          )}
          <Text style={[styles.title, { textAlign: 'center' }]}>{product.nombre}</Text>
          <Text style={[styles.subtitle, { textAlign: 'center' }]}>{details.description}</Text>
          <View
            style={{
              backgroundColor: '#FFF9F3',
              borderColor: '#F0E6DC',
              borderRadius: 14,
              borderWidth: 1,
              marginTop: 16,
              padding: 14,
              width: '100%',
            }}
          >
            <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '800' }}>
              Hecho con
            </Text>
            <Text style={[styles.subtitle, { marginTop: 4 }]}>
              {details.ingredients}
            </Text>
          </View>
          <Text style={{ color: colors.primaryDark, fontSize: 24, fontWeight: '800', marginTop: 20 }}>
            ${(product.precioCentavos / 100).toLocaleString('es-CO')}
          </Text>
        </View>
        <View style={{ marginTop: 20 }}>
          <Button
            label="Agregar al carrito"
            onPress={async () => {
              await addCartItem(product.id);
              router.push('/(tabs)/carrito');
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
