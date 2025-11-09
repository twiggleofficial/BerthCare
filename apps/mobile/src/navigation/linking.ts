import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import type { AppTabsParamList } from './types';

export const linking: LinkingOptions<AppTabsParamList> = {
  // Caregiver-first flow mirrors documented structure in
  // project-documentation/architecture-output.md (Navigation Structure)
  // and design-documentation/design-system/components/navigation.md.
  prefixes: [Linking.createURL('/')],
  config: {
    initialRouteName: 'Schedule',
    screens: {
      Schedule: {
        path: 'schedule',
        screens: {
          ScheduleList: '',
          VisitDetails: 'visit/:visitId',
        },
      },
      Clients: {
        path: 'clients',
        screens: {
          ClientsList: '',
          ClientDetails: 'client/:clientId',
        },
      },
      Profile: {
        path: 'profile',
        screens: {
          ProfileHome: '',
          Settings: 'settings',
        },
      },
    },
  },
};
