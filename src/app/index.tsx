import notifee, { AndroidImportance } from "@notifee/react-native";
import { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import dgram from "react-native-udp";

const CHANNEL_ID = "esp32_loud_alarm";

async function requestPermission() {
  await notifee.requestPermission();
}

async function setupNotificationChannel() {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "ESP32 Loud Alarm",
    importance: AndroidImportance.HIGH,
    sound: "loud_alarm",
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
  });
}

async function notifyUser(message: string) {
  await notifee.displayNotification({
    title: "ESP32 Alert",
    body: message,
    android: {
      channelId: CHANNEL_ID,
      importance: AndroidImportance.HIGH,
      sound: "loud_alarm",
      pressAction: {
        id: "default",
      },
    },
  });
}

export default function App() {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    async function initializeNotifications() {
      await requestPermission();
      await setupNotificationChannel();

      const batteryOptimizationEnabled =
        await notifee.isBatteryOptimizationEnabled();
      if (batteryOptimizationEnabled) {
        await notifee.openBatteryOptimizationSettings();
      }
    }

    initializeNotifications();

    const socket = dgram.createSocket({ type: "udp4", reusePort: true }) as any;

    socket.bind(4444, () => {
      socket.setBroadcast(true);
      console.log("UDP Listener bound to port 4444");
    });

    socket.on("message", async (msg: any, rinfo: { address: string }) => {
      const messageStr = msg.toString();
      const logEntry = `[${new Date().toLocaleTimeString()}] ${messageStr} from ${rinfo.address}`;
      console.log(`Received message: ${messageStr} from ${rinfo.address}`);

      setMessages((prevMessages) => [logEntry, ...prevMessages]);

      if (messageStr === "ESP32_ALERT") {
        await notifyUser(`Signal received from ${rinfo.address}`);
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ESP32 Listener Active</Text>
      <Text style={styles.subtext}>
        Listening for broadcasts on port 4444...
      </Text>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.button}
          activeOpacity={0.8}
          onPress={async () => {
            await requestPermission();
            await setupNotificationChannel();
            await notifyUser("Sensor triggered! Check ESP32 status.");
          }}
        >
          <Text style={styles.buttonText}>Test ESP32 Alarm</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.listContainer}>
        <FlatList
          data={messages}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>{item}</Text>
            </View>
          )}
          // 💡 Fixed prop name here:
          ListEmptyComponent={
            <Text style={styles.emptyText}>No alerts received yet.</Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f4",
    padding: 20,
    paddingTop: 60,
  },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 5, color: "#333" },
  subtext: { fontSize: 14, color: "#666", marginBottom: 20 },
  listContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 10,
    elevation: 2,
  },
  messageCard: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  messageText: { fontSize: 14, color: "#333", fontFamily: "monospace" },
  emptyText: { textAlign: "center", color: "#999", marginTop: 20 },
  button: {
    backgroundColor: "#ff4757",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
