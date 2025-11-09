import { useRouter } from 'expo-router';

import { ActivationScreen } from '../src/screens/Auth/ActivationScreen';

export default function ActivationRoute() {
  const router = useRouter();

  return (
    <ActivationScreen
      initialEmail="caregiver@example.com"
      onActivationComplete={() => {
        router.replace('/biometric-setup');
      }}
    />
  );
}
