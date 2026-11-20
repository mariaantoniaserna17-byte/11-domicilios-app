import { Redirect } from 'expo-router';
import { useSession } from '../context/SessionProvider';

export default function AuthEntryScreen() {
  const { session } = useSession();

  return <Redirect href={session ? '/(tabs)' : '/login'} />;
}
