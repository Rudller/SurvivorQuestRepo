// First, and deliberately so: it registers LogBox ignore patterns, and the
// warning it hides is emitted while the module graph below is still loading.
import "./src/shared/dev/silence-known-warnings";

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
