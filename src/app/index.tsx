import { useEventListener } from "expo";
import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Doorbell from "../../modules/doorbell";

const UDP_PORT = 4444;
const UDP_MESSAGE = "ESP32_ALERT";

type Status = {
  listening: boolean;
  ringing: boolean;
  batteryOk: boolean;
  fullScreenOk: boolean;
  notificationsOk: boolean;
};

async function hasNotificationPermission() {
  if (Number(Platform.Version) < 33) return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

async function readStatus(): Promise<Status> {
  return {
    listening: Doorbell.isListening(),
    ringing: Doorbell.isRinging(),
    batteryOk: Doorbell.isIgnoringBatteryOptimizations(),
    fullScreenOk: Doorbell.canUseFullScreenIntent(),
    notificationsOk: await hasNotificationPermission(),
  };
}

function AndroidDoorbell() {
  const [status, setStatus] = useState<Status | null>(null);

  const refresh = useCallback(async () => setStatus(await readStatus()), []);

  useEffect(() => {
    readStatus().then(setStatus);
    // Re-check after returning from the system settings.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEventListener(Doorbell, "onRing", refresh);
  useEventListener(Doorbell, "onRingStop", refresh);

  const requestNotifications = async () => {
    if (Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    refresh();
  };

  const start = async () => {
    if (!(await hasNotificationPermission())) await requestNotifications();
    await Doorbell.startListening(UDP_PORT, UDP_MESSAGE);
    // The service starts asynchronously.
    setTimeout(refresh, 500);
  };

  const stop = async () => {
    await Doorbell.stopListening();
    setTimeout(refresh, 500);
  };

  if (!status) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Klingelspiel</Text>

      <View style={[styles.card, status.listening ? styles.cardOn : styles.cardOff]}>
        <Text style={styles.cardTitle}>
          {status.ringing ? "🔔 Es klingelt!" : status.listening ? "Klingel ist aktiv" : "Klingel ist aus"}
        </Text>
        <Text style={styles.cardText}>
          {status.listening
            ? `Wartet auf „${UDP_MESSAGE}“ an UDP-Port ${UDP_PORT}, auch im Standby.`
            : "Einschalten, damit das Handy bei einem Signal klingelt."}
        </Text>
      </View>

      {status.listening ? (
        <Button label="Klingel ausschalten" onPress={stop} />
      ) : (
        <Button label="Klingel einschalten" onPress={start} primary />
      )}

      {status.ringing ? (
        <Button label="Klingeln stoppen" onPress={() => Doorbell.stopRinging()} primary />
      ) : (
        <Button label="Testklingeln" onPress={() => Doorbell.testRing()} />
      )}

      <Text style={styles.section}>Damit es zuverlässig laut klingelt</Text>
      <Check
        ok={status.notificationsOk}
        label="Benachrichtigungen erlaubt"
        action="Erlauben"
        onPress={requestNotifications}
      />
      <Check
        ok={status.batteryOk}
        label="Akku-Optimierung aus (sonst wird der Empfang im Standby gestoppt)"
        action="Ausschalten"
        onPress={() => Doorbell.requestIgnoreBatteryOptimizations()}
      />
      <Check
        ok={status.fullScreenOk}
        label="Vollbild über dem Sperrbildschirm erlaubt"
        action="Erlauben"
        onPress={() => Doorbell.openFullScreenIntentSettings()}
      />
      <Text style={styles.hint}>
        Die Klingel nutzt den Wecker-Kanal mit voller Lautstärke und klingelt deshalb auch im
        Lautlos-Modus. Bei „Bitte nicht stören“ müssen Wecker erlaubt sein (Standard).
      </Text>
    </ScrollView>
  );
}

function Button({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary && styles.buttonPrimary, pressed && { opacity: 0.7 }]}>
      <Text style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function Check({ ok, label, action, onPress }: { ok: boolean; label: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.check}>
      <Text style={styles.checkIcon}>{ok ? "✅" : "⚠️"}</Text>
      <Text style={styles.checkLabel}>{label}</Text>
      {!ok && (
        <Pressable onPress={onPress} style={styles.checkButton}>
          <Text style={styles.checkButtonText}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function App() {
  if (Platform.OS !== "android") {
    return (
      <View style={[styles.container, { flex: 1 }]}>
        <Text style={styles.cardText}>
          Die Klingel funktioniert nur auf Android. iOS erlaubt keinen dauerhaften UDP-Empfang im
          Hintergrund.
        </Text>
      </View>
    );
  }
  return <AndroidDoorbell />;
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 64, gap: 12, justifyContent: "center" },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 8 },
  card: { borderRadius: 16, padding: 16, gap: 4 },
  cardOn: { backgroundColor: "#DCFCE7" },
  cardOff: { backgroundColor: "#F3F4F6" },
  cardTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  cardText: { fontSize: 15, color: "#333" },
  button: { borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: "#E5E7EB" },
  buttonPrimary: { backgroundColor: "#C62828" },
  buttonText: { fontSize: 17, fontWeight: "600", color: "#111" },
  buttonTextPrimary: { color: "#fff" },
  section: { fontSize: 17, fontWeight: "700", marginTop: 16 },
  check: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkIcon: { fontSize: 18 },
  checkLabel: { flex: 1, fontSize: 15, color: "#888" },
  checkButton: { backgroundColor: "#208AEF", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  checkButtonText: { color: "#fff", fontWeight: "600" },
  hint: { fontSize: 13, color: "#888", marginTop: 8 },
});
