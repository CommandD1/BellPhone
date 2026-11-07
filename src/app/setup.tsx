/**
 * Ersteinrichtung: führt Schritt für Schritt durch alle Erlaubnisse.
 * Wird beim ersten Start gezeigt und später, wenn eine Erlaubnis fehlt.
 */
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, PermissionsAndroid, Platform, View } from "react-native";

import { BigButton, Body, Screen, Title, colors } from "@/components/big-ui";
import { hasNotificationPermission, readStatus, startDoorbell } from "@/doorbell-status";
import Doorbell from "../../modules/doorbell";

type PermissionStep = {
  title: string;
  text: string;
  isDone: () => Promise<boolean>;
  request: () => Promise<void>;
};

const TAP_ALLOW = "Tippen Sie unten auf „Erlauben“. Dann erscheint ein Fenster. Tippen Sie dort auf „Zulassen“.";

const PERMISSION_STEPS: Record<"notifications" | "battery" | "fullScreen", PermissionStep> = {
  notifications: {
    title: "Hinweise erlauben",
    text: `Damit Ihr Handy Ihnen zeigen kann, dass es klingelt.\n\n${TAP_ALLOW}`,
    isDone: hasNotificationPermission,
    request: async () => {
      if (Number(Platform.Version) < 33) return;
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      // Nach zweimaligem Ablehnen zeigt Android kein Fenster mehr: dann die App-Einstellungen öffnen.
      if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) await Linking.openSettings();
    },
  },
  battery: {
    title: "Immer bereit sein",
    text: `Damit die Klingel auch funktioniert, wenn Sie das Handy lange nicht benutzen.\n\n${TAP_ALLOW}`,
    isDone: async () => Doorbell.isIgnoringBatteryOptimizations(),
    request: () => Doorbell.requestIgnoreBatteryOptimizations(),
  },
  fullScreen: {
    title: "Auf dem Sperrbildschirm zeigen",
    text:
      "Damit Sie sofort sehen, dass es klingelt – auch wenn das Handy gesperrt ist.\n\n" +
      "Tippen Sie unten auf „Erlauben“. Es öffnet sich eine Einstellung. " +
      "Schalten Sie dort den Schalter ein. Tippen Sie danach auf den Zurück-Pfeil.",
    isDone: async () => Doorbell.canUseFullScreenIntent(),
    request: () => Doorbell.openFullScreenIntentSettings(),
  },
};

type Step = "welcome" | keyof typeof PERMISSION_STEPS | "done";

async function buildSteps(): Promise<Step[]> {
  const s = await readStatus();
  const steps: Step[] = [];
  if (!Doorbell.isOnboarded()) steps.push("welcome");
  if (!s.notificationsOk) steps.push("notifications");
  if (!s.batteryOk) steps.push("battery");
  if (!s.fullScreenOk) steps.push("fullScreen");
  steps.push("done");
  return steps;
}

export default function Setup() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    buildSteps().then(setSteps);
  }, []);

  const step = steps?.[index];
  const next = useCallback(() => {
    setFailed(false);
    setIndex((i) => i + 1);
  }, []);

  // Nach der Rückkehr aus den Android-Einstellungen prüfen, ob die Erlaubnis jetzt da ist.
  useEffect(() => {
    if (!step || step === "welcome" || step === "done") return;
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active" && (await PERMISSION_STEPS[step].isDone())) next();
    });
    return () => sub.remove();
  }, [step, next]);

  if (!steps || !step) return null;

  const permissionSteps = steps.filter((s) => s !== "welcome" && s !== "done");

  if (step === "welcome") {
    return (
      <Screen>
        <Title>Willkommen!</Title>
        <Body>Mit dieser App wird Ihr Handy zur Türklingel.</Body>
        <Body>
          Wenn jemand an Ihrer Tür klingelt, klingelt Ihr Handy laut. Auch wenn es gesperrt ist oder auf lautlos
          steht.
        </Body>
        <Body>Dafür braucht die App Ihre Erlaubnis. Wir gehen das jetzt zusammen durch, Schritt für Schritt.</Body>
        <Spacer />
        <BigButton label="Weiter" onPress={next} />
      </Screen>
    );
  }

  if (step === "done") {
    const finish = async () => {
      Doorbell.setOnboarded(true);
      await startDoorbell();
      if (router.canGoBack()) router.back();
      else router.replace("/");
    };
    return (
      <Screen>
        <Title>Fertig!</Title>
        <Body>Die Klingel ist jetzt eingeschaltet.</Body>
        <Body>Wenn es an Ihrer Tür klingelt, klingelt Ihr Handy laut.</Body>
        <Spacer />
        <BigButton label="Fertig" onPress={finish} />
      </Screen>
    );
  }

  const current = PERMISSION_STEPS[step];
  const allow = async () => {
    await current.request();
    if (await current.isDone()) next();
    else setFailed(true);
  };

  return (
    <Screen>
      <Body style={{ color: colors.muted, fontWeight: "700" }}>
        Schritt {permissionSteps.indexOf(step) + 1} von {permissionSteps.length}
      </Body>
      <Title>{current.title}</Title>
      <Body>{current.text}</Body>
      {failed && (
        <Body style={{ color: colors.danger, fontWeight: "700" }}>
          Das hat noch nicht geklappt. Bitte tippen Sie noch einmal auf „Erlauben“.
        </Body>
      )}
      <Spacer />
      <BigButton label="Erlauben" onPress={allow} />
      {failed && <BigButton label="Überspringen" kind="secondary" onPress={next} />}
    </Screen>
  );
}

function Spacer() {
  return <View style={{ flexGrow: 1 }} />;
}
