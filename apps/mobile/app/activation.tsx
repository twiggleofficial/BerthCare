import { useRouter } from 'expo-router';

import { ActivationScreen } from '../src/screens/Auth/ActivationScreen';

export default function ActivationRoute() {
  const router = useRouter();
  const initialEmail = __DEV__ ? process.env.EXPO_PUBLIC_DEMO_EMAIL : undefined;

  return (
    <ActivationScreen
      initialEmail={initialEmail}
      onActivationComplete={() => {
        router.replace('/biometric-setup');
      }}
    />
  );
}
