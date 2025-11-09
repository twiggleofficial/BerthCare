import { useRouter } from 'expo-router';

import { BiometricSetupScreen } from '../src/screens/Auth/BiometricSetupScreen';

export default function BiometricSetupRoute() {
  const router = useRouter();

  return (
    <BiometricSetupScreen
      onEnrollmentComplete={() => {
        router.replace('/');
      }}
    />
  );
}
