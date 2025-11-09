# Mobile Global Store

- Based on the "State Management Architecture" blueprint in `project-documentation/architecture-output.md`.
- Keeps caregiver-critical context (`currentVisit`, connectivity, sync status) available at a single source of truth with persistent rehydration powered by `zustand` + `AsyncStorage`.

## Persistence & security

- Storage layer: `zustand`’s `persist` middleware + `AsyncStorage` JSON driver (see `apps/mobile/src/store/index.ts`). All slices inside `useAppStore` are persisted under the `berthcare-app-store` key and rehydrated on launch.
- Persisted slices today:  
  - **Auth:** `user`, `tokens`, `isAuthenticated`, `activationMethod` (`apps/mobile/src/store/slices/auth-slice.ts`).  
  - **Sync:** `syncStatus`, `lastSyncTime`, `pendingChanges` (`slices/sync-slice.ts`).  
  - **Network:** `isOnline` (`slices/network-slice.ts`).  
  - **App:** `currentVisit` (`slices/app-slice.ts`).  
  - **Security:** `lastUnlockedAt` timestamps used by the PIN/Biometric flows (`slices/security-slice.ts`).
- Token handling: `accessToken`, `refreshToken`, `activationToken`, and `deviceId` are stored as plain JSON inside `AsyncStorage`. They inherit the OS sandbox protections but are **not encrypted at rest**. Tokens are refreshed via `apps/mobile/src/services/auth/session.ts` and cleared on logout (`logout()` in `auth-slice` resets the slice, nulls `lastUnlockedAt`, and immediately commits the wipe to storage). Retention lasts only until logout, a device wipe, or store version bump; tokens also expire server-side per backend TTLs.
- Sensitive-data guidance: any secret that must be encrypted (offline PIN hashes, biometric fallbacks, etc.) should use `expo-secure-store`/Keychain/Keystore rather than this store. Example: `apps/mobile/src/services/auth/offline-pin.ts` derives salted hashes and persists them via `SecureStore`.
- Rehydration: `store/index.ts` normalizes persisted dates through `ensureDate` during `merge` and `onRehydrateStorage`, ensuring subscribers receive `Date` objects after hydration even if AsyncStorage stored strings.
- Opting a slice out: wrap the slice in a separate Zustand store or use `persist`’s `partialize`/`skipHydration` hooks inside `store/index.ts` to omit keys (e.g., `partialize: ({ tokens, ...rest }) => rest`). Keep extremely transient UI state outside `useAppStore` to avoid persistence altogether.
- Audit pointers:  
  - Persistence config & devtools: `apps/mobile/src/store/index.ts`.  
  - Logout/token wiping logic: `apps/mobile/src/store/slices/auth-slice.ts`.  
  - Sync and connectivity state: `apps/mobile/src/store/slices/sync-slice.ts`, `network-slice.ts`.  
  - Security events & timestamps: `apps/mobile/src/store/slices/security-slice.ts`.

## Usage

```ts
import { useAppStore, authSelectors, networkSelectors } from '../store';

const isOnline = useAppStore(networkSelectors.isOnline);
const user = useAppStore(authSelectors.user);
```

> Adjust the relative path based on the importing file.

Actions such as `setCurrentVisit`, `beginSync`, `completeSync`, `setIsOnline`, and `setTokens` are exposed through the store instance via `useAppStore.getState()`.
