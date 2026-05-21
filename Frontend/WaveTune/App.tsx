/**
 * WaveTune - Music Streaming App
 * React Native CLI (no Expo)
 */

import React from "react";
import {
  StatusBar,
  View,
  Text,
  StyleSheet,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./src/screens/HomeScreen";
import PlayerScreen from "./src/screens/PlayerScreen";
import type { RootStackParamList } from "./src/navigation/types";
import { setupPlayer } from "./src/services/trackPlayerService";

const Stack = createNativeStackNavigator<RootStackParamList>();

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Unhandled app error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.loadingContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
          <Text style={styles.errorText}>Something went wrong while rendering the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [isPlayerReady, setIsPlayerReady] = React.useState(false);

  React.useEffect(() => {
    async function init() {
      await setupPlayer();
      setIsPlayerReady(true);
    }
    init();
  }, []);

  if (!isPlayerReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      </View>
    );
  }

  return (
    <RootErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: "#1DB954",
              background: "#0a0a0a",
              card: "#0a0a0a",
              text: "#ffffff",
              border: "rgba(255,255,255,0.1)",
              notification: "#1DB954",
            },
            fonts: {
              regular: { fontFamily: "System", fontWeight: "400" as const },
              medium: { fontFamily: "System", fontWeight: "500" as const },
              bold: { fontFamily: "System", fontWeight: "700" as const },
              heavy: { fontFamily: "System", fontWeight: "900" as const },
            },
          }}
        >
          <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: "slide_from_bottom",
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Player"
              component={PlayerScreen}
              options={{
                animation: "slide_from_bottom",
                gestureEnabled: true,
                gestureDirection: "vertical",
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorText: {
    color: "#ff4757",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default App;
