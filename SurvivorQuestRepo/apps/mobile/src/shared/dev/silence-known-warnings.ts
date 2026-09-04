import { LogBox } from "react-native";

/**
 * Warnings we have chosen to live with, hidden from the on-screen LogBox.
 *
 * This module must be imported before anything that can trigger them: LogBox
 * checks the ignore list when a log arrives and does not re-filter entries it
 * has already recorded, so registering late would let the first one through.
 *
 * Only the overlay is affected. The warnings still print to the Metro terminal,
 * which is where they belong — this is about not covering a tablet mid-game.
 */

// react-native-css-interop (NativeWind's engine) registers className support on
// react-native's core SafeAreaView, and simply reading that property trips RN
// 0.86's deprecation warnOnce. That registration is load-bearing despite the
// app never using core SafeAreaView: removing it — whether by upgrading
// css-interop past 0.2.2 or by patching the line out — collapses the Ryzykanci
// layout and leaves the bottom of the screen blank. Both were tried. So the
// warning stays and is silenced here instead.
LogBox.ignoreLogs(["SafeAreaView has been deprecated"]);
