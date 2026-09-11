import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router';
import { CharacterPage } from './character/CharacterPage.js';
import { db } from './db/db.js';
import { isSetupDone } from './db/meta.js';
import { LearnScreen } from './learn/LearnScreen.js';
import { PathScreen } from './path/PathScreen.js';
import { UnitScreen } from './path/UnitScreen.js';
import { PracticeScreen } from './practice/PracticeScreen.js';
import { ReviewScreen } from './review/ReviewScreen.js';
import { SettingsScreen } from './settings/SettingsScreen.js';
import { SetupScreen } from './setup/SetupScreen.js';
import { AppShell } from './ui/AppShell.js';
import { NotFound, RouteError } from './ui/RouteError.js';

export const rootRoute = createRootRoute({
  component: AppShell,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
  beforeLoad: async ({ location }) => {
    if (location.pathname !== '/setup' && !(await isSetupDone(db))) {
      throw redirect({ to: '/setup' });
    }
  },
});

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: PathScreen,
});
export const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  component: SetupScreen,
});
export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsScreen,
});
export const unitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unit/$unitId',
  component: UnitScreen,
});

export const learnRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unit/$unitId/learn',
  component: LearnScreen,
});
export const practiceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/unit/$unitId/practice',
  component: PracticeScreen,
});
export const reviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/review',
  component: ReviewScreen,
});
export const characterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/character/$charCode',
  component: CharacterPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  setupRoute,
  settingsRoute,
  unitRoute,
  learnRoute,
  practiceRoute,
  reviewRoute,
  characterRoute,
]);

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, ...(history ? { history } : {}) });
}

export const router = createAppRouter();

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
