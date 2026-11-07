import { useEventListener } from "expo";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { BigButton, Body, Card, Screen, Title, colors } from "@/components/big-ui";
import { startDoorbell, useDoorbellStatus } from "@/doorbell-status";
import { ringtoneName } from "@/ringtones";
import Doorbell from "../../modules/doorbell";

export default function Settings() {
  const { status, refresh } = useDoorbellStatus();
  const [ringtones] = useState(() => Doorbell.getRingtones());
  const [selected, setSelected] = useState(() => Doorbell.getSelectedRingtone());
  const [playing, setPlaying] = useState<string | null>(null);

  useEventListener(Doorbell, "onPreviewEnd", () => setPlaying(null));

  // Probehören beenden, wenn man die Seite verlässt.
  useFocusEffect(
    useCallback(
      () => () => {
        Doorbell.stopPreview();
      },
      []
    )
  );

  if (!status) return null;

  const turnOff = () =>
    Alert.alert("Klingel ausschalten?", "Dann klingelt Ihr Handy nicht mehr, wenn es an der Tür klingelt.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Ausschalten",
        style: "destructive",
        onPress: async () => {
          await Doorbell.stopRinging();
          await Doorbell.stopListening();
          refresh();
        },
      },
    ]);

  const turnOn = async () => {
    await startDoorbell();
    refresh();
  };

  const select = (id: string) => {
    Doorbell.setSelectedRingtone(id);
    setSelected(id);
  };

  const togglePreview = async (id: string) => {
    if (playing === id) {
      await Doorbell.stopPreview();
      setPlaying(null);
    } else {
      setPlaying(id);
      await Doorbell.previewRingtone(id);
    }
  };

  return (
    <Screen>
      <BigButton label="‹ Zurück" kind="secondary" onPress={() => router.back()} />
      <Title>Einstellungen</Title>

      <Body style={styles.section}>Klingel</Body>
      {status.listening ? (
        <Card background={colors.successBg}>
          <Body style={{ fontWeight: "800", color: colors.success }}>✓ Die Klingel ist an</Body>
          <BigButton label="Klingel ausschalten" kind="danger" onPress={turnOff} />
        </Card>
      ) : (
        <Card>
          <Body style={{ fontWeight: "800" }}>Die Klingel ist aus</Body>
          <BigButton label="Klingel einschalten" onPress={turnOn} />
        </Card>
      )}

      <Body style={styles.section}>Klingelton</Body>
      <Body>Tippen Sie auf einen Klingelton, um ihn auszuwählen.</Body>
      <Body style={{ color: colors.muted }}>Achtung: Beim Anhören ist der Ton so laut wie beim echten Klingeln.</Body>

      {ringtones.map((id) => {
        const isSelected = id === selected;
        return (
          <Pressable
            key={id}
            onPress={() => select(id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            style={[styles.ringtone, isSelected && styles.ringtoneSelected]}>
            <View style={styles.ringtoneHeader}>
              <Body style={{ fontWeight: "800", flex: 1 }}>{ringtoneName(id)}</Body>
              {isSelected && <Body style={{ color: colors.primary, fontWeight: "800" }}>✓ Ausgewählt</Body>}
            </View>
            <BigButton
              label={playing === id ? "■ Anhören beenden" : "▶ Anhören"}
              kind="secondary"
              onPress={() => togglePreview(id)}
            />
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 28, fontWeight: "800", marginTop: 12 },
  ringtone: {
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.border,
    padding: 20,
    gap: 16,
  },
  ringtoneSelected: { borderColor: colors.primary, borderWidth: 5, backgroundColor: "#EAF1FD" },
  ringtoneHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
});
