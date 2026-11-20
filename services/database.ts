import * as SQLite from 'expo-sqlite';

export type ProductCache = {
  id: string;
  nombre: string;
  precioCentavos: number;
  categoria: string;
  fotoUrl: string | null;
  disponible: boolean;
};

export type CartItem = {
  id: number;
  productoId: string;
  cantidad: number;
};

export type LocalOrder = {
  id: string;
  userId: string;
  estado: string;
  totalCentavos: number;
  direccion: string;
  lat: number | null;
  lng: number | null;
  notas?: string | null;
  creadoEn?: string;
};

type ProductCacheRow = {
  id: string;
  nombre: string;
  precio_centavos: number;
  categoria: string;
  foto_url: string | null;
  disponible: number;
};

type CartItemRow = {
  id: number;
  producto_id: string;
  cantidad: number;
};

type DatabaseOrderRow = {
  id: string;
  user_id: string;
  estado: string;
  total_centavos: number;
  direccion: string;
  lat: number | null;
  lng: number | null;
  notas: string | null;
  creado_en: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndPrepareDatabase();
  }

  return databasePromise;
}

export const getDatabase = initializeDatabase;

async function openAndPrepareDatabase() {
  const database = await SQLite.openDatabaseAsync('domicilios.db');

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS producto_cache (
      id TEXT PRIMARY KEY NOT NULL,
      nombre TEXT NOT NULL,
      precio_centavos INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      foto_url TEXT,
      disponible INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS carrito_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id TEXT NOT NULL UNIQUE,
      cantidad INTEGER NOT NULL CHECK (cantidad > 0),
      FOREIGN KEY (producto_id) REFERENCES producto_cache(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pedido (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      estado TEXT NOT NULL,
      total_centavos INTEGER NOT NULL,
      direccion TEXT NOT NULL,
      lat REAL,
      lng REAL,
      notas TEXT,
      creado_en TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_producto_cache_categoria
      ON producto_cache (categoria);
    CREATE INDEX IF NOT EXISTS idx_pedido_creado_en
      ON pedido (creado_en);
  `);
  const orderColumns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(pedido)',
  );

  if (!orderColumns.some((column) => column.name === 'notas')) {
    await database.execAsync('ALTER TABLE pedido ADD COLUMN notas TEXT');
  }
  if (!orderColumns.some((column) => column.name === 'user_id')) {
    await database.execAsync('ALTER TABLE pedido ADD COLUMN user_id TEXT');
  }
  await database.execAsync(
    'CREATE INDEX IF NOT EXISTS idx_pedido_user_id ON pedido (user_id);',
  );

  return database;
}

export async function saveProductCache(products: ProductCache[]) {
  const database = await getDatabase();

  for (const product of products) {
    await database.runAsync(
      `INSERT INTO producto_cache
        (id, nombre, precio_centavos, categoria, foto_url, disponible)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         nombre = excluded.nombre,
         precio_centavos = excluded.precio_centavos,
         categoria = excluded.categoria,
         foto_url = excluded.foto_url,
         disponible = excluded.disponible`,
      product.id,
      product.nombre,
      product.precioCentavos,
      product.categoria,
      product.fotoUrl,
      product.disponible ? 1 : 0,
    );
  }
}

export async function getCachedProducts(): Promise<ProductCache[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<ProductCacheRow>(
    'SELECT id, nombre, precio_centavos, categoria, foto_url, disponible FROM producto_cache ORDER BY nombre',
  );

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    precioCentavos: row.precio_centavos,
    categoria: row.categoria,
    fotoUrl: row.foto_url,
    disponible: row.disponible === 1,
  }));
}

export async function addCartItem(productoId: string, cantidad = 1) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new Error('La cantidad debe ser un entero positivo');
  }

  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO carrito_item (producto_id, cantidad)
     VALUES (?, ?)
     ON CONFLICT(producto_id) DO UPDATE SET cantidad = cantidad + excluded.cantidad`,
    productoId,
    cantidad,
  );
}

export async function removeCartItem(productoId: string, cantidad = 1) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new Error('La cantidad debe ser un entero positivo');
  }

  const database = await getDatabase();
  await database.runAsync(
    'DELETE FROM carrito_item WHERE producto_id = ? AND cantidad <= ?',
    productoId,
    cantidad,
  );
  await database.runAsync(
    `UPDATE carrito_item
     SET cantidad = cantidad - ?
     WHERE producto_id = ? AND cantidad > ?`,
    cantidad,
    productoId,
    cantidad,
  );
}

export async function getCartItems(): Promise<CartItem[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<CartItemRow>(
    'SELECT id, producto_id, cantidad FROM carrito_item ORDER BY id',
  );

  return rows.map((row) => ({
    id: row.id,
    productoId: row.producto_id,
    cantidad: row.cantidad,
  }));
}

export async function clearCart() {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM carrito_item');
}

export async function registerLocalOrder(order: LocalOrder) {
  const database = await getDatabase();
  const creadoEn = order.creadoEn ?? new Date().toISOString();

  await database.runAsync(
    `INSERT INTO pedido
      (id, user_id, estado, total_centavos, direccion, lat, lng, notas, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       estado = excluded.estado,
       total_centavos = excluded.total_centavos,
       direccion = excluded.direccion,
       lat = excluded.lat,
       lng = excluded.lng,
       notas = excluded.notas,
       creado_en = excluded.creado_en`,
    order.id,
    order.userId,
    order.estado,
    order.totalCentavos,
    order.direccion,
    order.lat,
    order.lng,
    order.notas ?? null,
    creadoEn,
  );
}

export async function getLocalOrders(userId: string): Promise<LocalOrder[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<DatabaseOrderRow>(
    `SELECT id, user_id, estado, total_centavos, direccion, lat, lng, notas, creado_en
     FROM pedido
     WHERE user_id = ?
     ORDER BY creado_en DESC`,
    userId,
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    estado: row.estado,
    totalCentavos: row.total_centavos,
    direccion: row.direccion,
    lat: row.lat,
    lng: row.lng,
    notas: row.notas,
    creadoEn: row.creado_en,
  }));
}

export async function updateLocalOrderStatus(
  orderId: string,
  userId: string,
  estado: string,
) {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE pedido SET estado = ? WHERE id = ? AND user_id = ?',
    estado,
    orderId,
    userId,
  );
}
