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
import { registerUser } from '../services/api';

export default function RegisterScreen() {
  const { signIn } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      setError('Completa todos los campos para crear tu cuenta.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await registerUser({
        email: trimmedEmail,
        name: trimmedName,
        password,
      });

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
          : 'No fue posible crear la cuenta.',
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
          <Text style={styles.eyebrow}>BIENVENIDO</Text>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <Text style={styles.subtitle}>
            Regístrate para guardar tus direcciones y pedidos.
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
            </View>
          ) : null}

          <Text style={labelStyle}>Nombre</Text>
          <TextInput
            autoCapitalize="words"
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={colors.muted}
            style={inputStyle}
            value={name}
          />
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
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={inputStyle}
            value={password}
          />

          <View style={{ marginTop: 24 }}>
            <Button
              label={loading ? 'Creando cuenta...' : 'Crear cuenta'}
              onPress={() => void handleRegister()}
            />
          </View>
          <View style={{ alignItems: 'center', marginTop: 20 }}>
            <Text style={styles.subtitle}>¿Ya tienes una cuenta?</Text>
            <Link href="/login" style={{ color: colors.primary, fontWeight: '800', marginTop: 6 }}>
              Iniciar sesión
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
