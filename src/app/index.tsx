import { AppSplashScreen } from '@/components/auth/app-splash-screen';
import { useAuth } from '@/contexts/auth-context';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AppSplashScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return <Redirect href="/(tabs)/(home)" />;
}
