import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, colors, Screen, styles } from '../components/ui';
import { useSession } from '../context/SessionProvider';
import { loginUser, requestPasswordReset } from '../services/api';

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handlePasswordReset = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Ingresa tu correo para recibir el enlace de recuperación.');
      return;
    }

    setResetting(true);
    setError(null);
    setResetMessage(null);

    try {
      setResetMessage(await requestPasswordReset(trimmedEmail));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible solicitar el cambio de contraseña.',
      );
    } finally {
      setResetting(false);
    }
  };

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loginUser({ email: trimmedEmail, password });

      signIn({
        address: '',
        email: result.email,
        id: result.userId,
        name: result.name,
        token: result.token,
      });
      router.replace('/(tabs)');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible iniciar sesión.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.eyebrow}>QUÉ BUENO VERTE</Text>
          <Text style={styles.title}>Inicia sesión</Text>
          <Text style={styles.subtitle}>Continúa con tus pedidos favoritos.</Text>

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
            </View>
          ) : null}

          <Text style={labelStyle}>Correo electrónico</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={colors.muted}
            style={inputStyle}
            value={email}
          />
          <Text style={labelStyle}>Contraseña</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={inputStyle}
            value={password}
          />

          {resetMessage ? (
            <View style={[styles.card, { backgroundColor: '#EAF8F0', marginTop: 16 }]}>
              <Text style={{ color: colors.success, fontWeight: '700' }}>
                {resetMessage}
              </Text>
            </View>
          ) : null}
          <View style={{ marginTop: 24 }}>
            {resetMode ? (
              <>
                <Button
                  label={resetting ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
                  onPress={() => void handlePasswordReset()}
                />
                <View style={{ marginTop: 10 }}>
                  <Button
                    label="Volver a iniciar sesión"
                    onPress={() => {
                      setResetMode(false);
                      setError(null);
                      setResetMessage(null);
                    }}
                    variant="secondary"
                  />
                </View>
              </>
            ) : (
              <Button
                label={loading ? 'Ingresando...' : 'Iniciar sesión'}
                onPress={() => void handleLogin()}
              />
            )}
          </View>
          {!resetMode ? (
            <View style={{ alignItems: 'center', marginTop: 14 }}>
              <Button
                label="¿Olvidaste tu contraseña?"
                onPress={() => {
                  setResetMode(true);
                  setError(null);
                  setResetMessage(null);
                }}
                variant="secondary"
              />
            </View>
          ) : null}
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={styles.subtitle}>¿Aún no tienes una cuenta?</Text>
            <Link href="/register" style={{ color: colors.primary, fontWeight: '800', marginTop: 6 }}>
              Crear cuenta
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const labelStyle = {
  color: colors.ink,
  fontSize: 15,
  fontWeight: '700' as const,
  marginBottom: 8,
  marginTop: 18,
};

const inputStyle = {
  backgroundColor: colors.card,
  borderColor: colors.border,
  borderRadius: 14,
  borderWidth: 1,
  color: colors.ink,
  fontSize: 16,
  padding: 16,
};
