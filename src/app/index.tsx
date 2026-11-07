import { Redirect, router } from "expo-router";
import { Platform } from "react-native";

import { BigButton, Body, Card, Screen, Title, colors } from "@/components/big-ui";
import { allPermissionsOk, startDoorbell, useDoorbellStatus } from "@/doorbell-status";
import Doorbell from "../../modules/doorbell";

export default function Home() {
  if (Platform.OS !== "android") {
    return (
      <Screen>
        <Body>Diese App funktioniert nur auf Android-Handys.</Body>
      </Screen>
    );
  }
  if (!Doorbell.isOnboarded()) return <Redirect href="/setup" />;
  return <AndroidHome />;
}

function AndroidHome() {
  const { status, refresh } = useDoorbellStatus();
  if (!status) return null;

  const turnOn = async () => {
    await startDoorbell();
    refresh();
  };

  return (
    <Screen>
      {status.ringing ? (
        <Card background={colors.dangerBg}>
          <Title>🔔 Es klingelt!</Title>
          <BigButton label="Klingeln beenden" kind="danger" onPress={() => Doorbell.stopRinging()} />
        </Card>
      ) : status.listening ? (
        <Card background={colors.successBg}>
          <Body style={{ fontWeight: "800", color: colors.success }}>✓ Die Klingel ist an</Body>
          <Body>Wenn es an Ihrer Tür klingelt, klingelt Ihr Handy laut.</Body>
        </Card>
      ) : (
        <Card>
          <Body style={{ fontWeight: "800" }}>Die Klingel ist aus</Body>
          <Body>Ihr Handy klingelt nicht, wenn es an der Tür klingelt.</Body>
          <BigButton label="Klingel einschalten" onPress={turnOn} />
        </Card>
      )}

      {!allPermissionsOk(status) && (
        <Card background={colors.warningBg}>
          <Body style={{ fontWeight: "800" }}>⚠️ Eine Erlaubnis fehlt</Body>
          <Body>Ohne sie klingelt Ihr Handy vielleicht nicht.</Body>
          <BigButton label="Jetzt beheben" onPress={() => router.push("/setup")} />
        </Card>
      )}

      {!status.ringing && (
        <BigButton label="Klingel ausprobieren" kind="secondary" onPress={() => Doorbell.testRing()} />
      )}
      <BigButton label="Einstellungen" kind="secondary" onPress={() => router.push("/settings")} />
    </Screen>
  );
}
