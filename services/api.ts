type AuthCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = AuthCredentials & {
  name: string;
};

export type AuthResponse = {
  token?: string;
  userId: string;
  email: string;
  name: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function getString(record: JsonRecord, key: string) {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

async function requestAuth(
  path: string,
  payload: AuthCredentials | RegisterCredentials,
): Promise<AuthResponse> {
  const apiUrl = (
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    'https://11-domicilios-api.vercel.app'
  ).replace(/\/+$/, '');

  if (!apiUrl) {
    throw new Error('Configura EXPO_PUBLIC_API_URL para conectar con la API.');
  }

  let response: Response;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      response = await fetch(`${apiUrl}${path}`, {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        'La API tardó demasiado en responder. Verifica tu conexión e inténtalo nuevamente.',
      );
    }

    throw new Error(
      'No se pudo conectar con la API. Verifica tu Wi-Fi, datos móviles y acceso al dominio 11-domicilios-api.vercel.app.',
    );
  }
  let responseBody: unknown = null;

  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    const message = isRecord(responseBody)
      ? getString(responseBody, 'error') ?? getString(responseBody, 'message')
      : undefined;

    throw new Error(message ?? 'La API rechazó la solicitud de autenticación.');
  }

  if (!isRecord(responseBody)) {
    throw new Error('La API devolvió una respuesta de autenticación inválida.');
  }

  const token =
    getString(responseBody, 'token') ??
    getString(responseBody, 'accessToken') ??
    getString(responseBody, 'idToken');
  const user = isRecord(responseBody.user) ? responseBody.user : responseBody;
  const userId =
    getString(user, 'id') ?? getString(user, 'uid') ?? payload.email;
  const email = getString(user, 'email') ?? payload.email;
  const name =
    getString(user, 'name') ??
    ('name' in payload && typeof payload.name === 'string'
      ? payload.name
      : payload.email);

  if (!token && path !== '/api/auth/register') {
    throw new Error('La API no devolvió un token de sesión.');
  }

  return { token, userId, email, name };
}

export function registerUser(payload: RegisterCredentials) {
  return requestAuth('/api/auth/register', payload);
}

export async function loginUser(payload: AuthCredentials): Promise<AuthResponse> {
  const apiUrl = (
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    'https://11-domicilios-api.vercel.app'
  ).replace(/\/+$/, '');

  let backendResponse: Response;

  try {
    backendResponse = await fetch(`${apiUrl}/api/auth/login`, {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  } catch {
    throw new Error('No se pudo verificar la sesión con la API.');
  }

  let backendBody: unknown = null;

  try {
    backendBody = await backendResponse.json();
  } catch {
    backendBody = null;
  }

  if (!backendResponse.ok) {
    const message =
      isRecord(backendBody)
        ? getString(backendBody, 'error') ?? getString(backendBody, 'message')
        : undefined;
    throw new Error(message ?? 'La API no pudo validar la sesión.');
  }

  if (!isRecord(backendBody)) {
    throw new Error('La API devolvió una respuesta inválida.');
  }

  const backendUser = isRecord(backendBody.user)
    ? backendBody.user
    : backendBody;

  return {
    token: getString(backendBody, 'token'),
    userId:
      getString(backendUser, 'uid') ??
      getString(backendUser, 'id') ??
      payload.email,
    email:
      getString(backendUser, 'email') ??
      payload.email,
    name:
      getString(backendUser, 'displayName') ??
      getString(backendUser, 'name') ??
      payload.email,
  };
}

export async function requestPasswordReset(email: string): Promise<string> {
  const apiUrl = (
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    'https://11-domicilios-api.vercel.app'
  ).replace(/\/+$/, '');

  const response = await fetch(`${apiUrl}/api/auth/forgot-password`, {
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message = isRecord(body) ? getString(body, 'error') : undefined;
    throw new Error(
      message ?? 'No fue posible solicitar el cambio de contraseña.',
    );
  }

  return isRecord(body)
    ? getString(body, 'message') ??
        'Revisa tu correo para cambiar la contraseña.'
    : 'Revisa tu correo para cambiar la contraseña.';
}

export type RemoteOrder = {
  id: string;
  estado: 'recibido' | 'preparando' | 'en_camino' | 'entregado' | 'cancelado';
  totalCentavos: number;
  envioCentavos: number;
  direccion: string;
  lat: number;
  lng: number;
  notas: string | null;
  creadoEn: string;
};

export type CreateOrderPayload = {
  address: string;
  lat: number;
  lng: number;
  notes: string | null;
  items: Array<{ productoId: string; cantidad: number }>;
};

async function authenticatedRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const apiUrl = (
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    'https://11-domicilios-api.vercel.app'
  ).replace(/\/+$/, '');
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      isRecord(body)
        ? getString(body, 'error') ?? getString(body, 'message')
        : undefined;
    throw new Error(message ?? 'La API no pudo completar la solicitud.');
  }

  return body as T;
}

export function createRemoteOrder(
  token: string,
  payload: CreateOrderPayload,
) {
  return authenticatedRequest<{
    pedido: RemoteOrder;
  }>('/api/pedidos', token, {
    body: JSON.stringify(payload),
    method: 'POST',
  }).then((body) => body.pedido);
}

export function getRemoteOrders(token: string) {
  return authenticatedRequest<{ pedidos: RemoteOrder[] }>(
    '/api/pedidos',
    token,
  ).then((body) => body.pedidos);
}

export function cancelRemoteOrder(token: string, orderId: string) {
  return authenticatedRequest<{ pedido: RemoteOrder }>(
    `/api/pedidos/${encodeURIComponent(orderId)}/cancelar`,
    token,
    { method: 'PATCH' },
  ).then((body) => body.pedido);
}

export function advanceRemoteOrder(token: string, orderId: string) {
  return authenticatedRequest<{ pedido: RemoteOrder }>(
    `/api/pedidos/${encodeURIComponent(orderId)}/estado`,
    token,
    { method: 'PATCH' },
  ).then((body) => body.pedido);
}
