import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type ScheduleStackParamList = {
  ScheduleList: undefined;
  VisitDetails: { visitId: string };
};

export type ClientsStackParamList = {
  ClientsList: undefined;
  ClientDetails: { clientId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
};

export type AppTabsParamList = {
  Schedule: NavigatorScreenParams<ScheduleStackParamList>;
  Clients: NavigatorScreenParams<ClientsStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type ScheduleStackScreenProps<Screen extends keyof ScheduleStackParamList> =
  NativeStackScreenProps<ScheduleStackParamList, Screen>;

export type ClientsStackScreenProps<Screen extends keyof ClientsStackParamList> =
  NativeStackScreenProps<ClientsStackParamList, Screen>;

export type ProfileStackScreenProps<Screen extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, Screen>;

export type AppTabScreenProps<Screen extends keyof AppTabsParamList> =
  BottomTabScreenProps<AppTabsParamList, Screen>;
