import notifee from "@notifee/react-native";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import dgram from "react-native-udp";

export default function App() {
  useEffect(() => {
    async function setupBatteryExemption() {
      const batteryOptimizationEnabled =
        await notifee.isBatteryOptimizationEnabled();
      if (batteryOptimizationEnabled) {
        await notifee.openBatteryOptimizationSettings();
      }
    }
    setupBatteryExemption();

    // 💡 Added 'as any' here to fix the TypeScript error on .on() and .setBroadcast()
    const socket = dgram.createSocket({ type: "udp4", reusePort: true }) as any;

    socket.bind(4444, "0.0.0.0", () => {
      socket.setBroadcast(true);
      console.log("UDP Listener bound to 0.0.0.0:4444");
    });

    socket.on("message", async (msg: any, rinfo: { address: string }) => {
      const messageStr = msg.toString();
      console.log(`Received message: ${messageStr} from ${rinfo.address}`);

      if (messageStr === "ESP32_ALERT") {
        await notifee.displayNotification({
          title: "ESP32 Alert!",
          body: "The device sent a standby signal.",
          android: {
            channelId: "default",
          },
        });
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text>Listening for ESP32 signals in the background...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
