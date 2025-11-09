import { NavigationIndependentTree } from '@react-navigation/native';

import { AppNavigator } from '../src/navigation/AppNavigator';
import { ProtectedRoute } from '../src/navigation/ProtectedRoute';

export default function CaregiverApp() {
  return (
    <ProtectedRoute>
      <NavigationIndependentTree>
        <AppNavigator />
      </NavigationIndependentTree>
    </ProtectedRoute>
  );
}
