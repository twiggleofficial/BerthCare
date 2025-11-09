import { Suspense, lazy, useMemo } from 'react';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, useTheme } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

import type {
  AppTabsParamList,
  ClientsStackParamList,
  ProfileStackParamList,
  ScheduleStackParamList,
} from './types';
import { linking } from './linking';
import { ScheduleListScreen } from '../screens/Schedule/ScheduleListScreen';
import type { BerthcareTheme } from '../design-system';

const VisitDetailsScreen = lazy(async () => {
  const module = await import('../screens/Schedule/VisitDetailsScreen');
  return { default: module.VisitDetailsScreen };
});

const ClientsListScreen = lazy(async () => {
  const module = await import('../screens/Clients/ClientsListScreen');
  return { default: module.ClientsListScreen };
});

const ClientDetailsScreen = lazy(async () => {
  const module = await import('../screens/Clients/ClientDetailsScreen');
  return { default: module.ClientDetailsScreen };
});

const ProfileHomeScreen = lazy(async () => {
  const module = await import('../screens/Profile/ProfileHomeScreen');
  return { default: module.ProfileHomeScreen };
});

const SettingsScreen = lazy(async () => {
  const module = await import('../screens/Profile/SettingsScreen');
  return { default: module.SettingsScreen };
});

const Tab = createBottomTabNavigator<AppTabsParamList>();
const ScheduleStack = createNativeStackNavigator<ScheduleStackParamList>();
const ClientsStack = createNativeStackNavigator<ClientsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

type TabIconName = keyof typeof MaterialCommunityIcons.glyphMap;

const tabIcons: Record<keyof AppTabsParamList, TabIconName> = {
  Schedule: 'calendar-check',
  Clients: 'account-multiple',
  Profile: 'account-circle',
};

function ScheduleNavigator() {
  return (
    <ScheduleStack.Navigator screenOptions={{ headerShown: false }}>
      <ScheduleStack.Screen name="ScheduleList" component={ScheduleListScreen} />
      <ScheduleStack.Screen name="VisitDetails" component={VisitDetailsScreen} />
    </ScheduleStack.Navigator>
  );
}

function ClientsNavigator() {
  return (
    <ClientsStack.Navigator screenOptions={{ headerShown: false }}>
      <ClientsStack.Screen name="ClientsList" component={ClientsListScreen} />
      <ClientsStack.Screen name="ClientDetails" component={ClientDetailsScreen} />
    </ClientsStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileHomeScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
    </ProfileStack.Navigator>
  );
}

export function AppNavigator() {
  const paperTheme = useTheme<BerthcareTheme>();
  const navigationTheme = useMemo<Theme>(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: paperTheme.colors.primary,
        background: paperTheme.colors.background,
        card: paperTheme.colors.surface,
        text: paperTheme.colors.onSurface,
        border: paperTheme.colors.outline,
      },
    }),
    [paperTheme],
  );

  return (
    <Suspense fallback={<LazyScreenFallback />}>
      <NavigationContainer linking={linking} theme={navigationTheme}>
        <Tab.Navigator
          initialRouteName="Schedule"
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: paperTheme.colors.primary,
            tabBarInactiveTintColor: paperTheme.colors.onSurfaceVariant,
            tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
            tabBarStyle: {
              borderTopColor: paperTheme.colors.outlineVariant,
              paddingBottom: 4,
              height: 64,
            },
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name={tabIcons[route.name]}
                color={color}
                size={size}
              />
            ),
          })}
        >
          <Tab.Screen name="Schedule" component={ScheduleNavigator} />
          <Tab.Screen name="Clients" component={ClientsNavigator} />
          <Tab.Screen name="Profile" component={ProfileNavigator} />
        </Tab.Navigator>
      </NavigationContainer>
    </Suspense>
  );
}

export default AppNavigator;

function LazyScreenFallback() {
  const theme = useTheme<BerthcareTheme>();

  return (
    <View
      style={[
        styles.lazyFallback,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <ActivityIndicator animating color={theme.colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  lazyFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
