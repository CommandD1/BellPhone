/**
 * Bausteine für eine seniorengerechte Oberfläche:
 * großer Text, große Knöpfe, hoher Kontrast.
 */
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type TextProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const APP_NAME = "BellPhone";

export const colors = {
  background: "#FFFFFF",
  text: "#111111",
  muted: "#444444",
  primary: "#0B57D0",
  danger: "#B3261E",
  success: "#1B7F3B",
  successBg: "#E3F4E8",
  dangerBg: "#FCE8E6",
  warningBg: "#FFF4CC",
  neutralBg: "#EEEEEE",
  border: "#BBBBBB",
};

// Systemweite Schriftvergrößerung zulassen, aber das Layout nicht sprengen.
const MAX_SCALE = 1.3;

export function Title({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.title} maxFontSizeMultiplier={MAX_SCALE} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Body({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text style={[styles.body, style]} maxFontSizeMultiplier={MAX_SCALE} {...rest}>
      {children}
    </Text>
  );
}

type ButtonKind = "primary" | "secondary" | "danger";

export function BigButton({
  label,
  onPress,
  kind = "primary",
}: {
  label: string;
  onPress: () => void;
  kind?: ButtonKind;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, buttonStyles[kind], pressed && styles.pressed]}>
      <Text style={[styles.buttonText, kind === "secondary" && { color: colors.text }]} maxFontSizeMultiplier={MAX_SCALE}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({ children, background = colors.neutralBg }: { children: ReactNode; background?: string }) {
  return <View style={[styles.card, { backgroundColor: background }]}>{children}</View>;
}

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.screen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
      ]}>
      <Text style={styles.brand} maxFontSizeMultiplier={MAX_SCALE} accessibilityRole="header">
        {APP_NAME}
      </Text>
      {children}
    </ScrollView>
  );
}

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  danger: { backgroundColor: colors.danger },
  secondary: { backgroundColor: colors.background, borderWidth: 3, borderColor: colors.text },
});

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 20, gap: 20, flexGrow: 1 },
  brand: { fontSize: 40, lineHeight: 48, fontWeight: "900", color: colors.text, textAlign: "center", letterSpacing: 0.5 },
  title: { fontSize: 36, lineHeight: 44, fontWeight: "800", color: colors.text },
  body: { fontSize: 24, lineHeight: 34, color: colors.text },
  button: {
    minHeight: 80,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 26, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  pressed: { opacity: 0.6 },
  card: { borderRadius: 20, padding: 20, gap: 12 },
});
