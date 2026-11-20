import { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const colors = {
  background: '#FFF9F3',
  card: '#FFFFFF',
  ink: '#29221D',
  muted: '#796E65',
  primary: '#E85D3F',
  primaryDark: '#C9482E',
  accent: '#F6C453',
  border: '#F0E6DC',
  success: '#3D9B6D',
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function Button({ label, onPress, variant = 'primary' }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryButtonText]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Screen({ children }: PropsWithChildren) {
  return <View style={styles.screen}>{children}</View>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  title: { color: colors.ink, fontSize: 29, fontWeight: '800', marginTop: 6 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 6 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryButton: { backgroundColor: '#FFF0E8', borderColor: '#FFD9C9', borderWidth: 1 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  secondaryButtonText: { color: colors.primaryDark },
  pressed: { opacity: 0.78 },
});
