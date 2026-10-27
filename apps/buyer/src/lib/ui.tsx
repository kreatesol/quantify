import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type TextInputProps, TextInput } from "react-native";

export const colors = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  text: "#14171F",
  muted: "#5B6170",
  border: "#D9DCE3",
  primary: "#1F6FEB",
  primaryText: "#FFFFFF",
  error: "#C62828",
};

export function Screen({ children }: { children: ReactNode }) {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? (
    <Text style={styles.error} accessibilityRole="alert">
      {children}
    </Text>
  ) : null;
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.field, props.style]} />;
}

export function Button({
  label,
  onPress,
  busy,
  disabled,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "link";
}) {
  const inactive = disabled || busy;
  if (variant === "link") {
    return (
      <Pressable onPress={onPress} disabled={inactive} accessibilityRole="button" style={styles.link}>
        <Text style={[styles.linkText, inactive && styles.inactive]}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={[styles.button, inactive && styles.inactive]}
    >
      {busy ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  content: { width: "100%", maxWidth: 420, padding: 24, paddingTop: 72, gap: 16 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  body: { fontSize: 16, lineHeight: 22, color: colors.muted },
  error: { fontSize: 15, color: colors.error },
  field: {
    fontSize: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  buttonText: { color: colors.primaryText, fontSize: 17, fontWeight: "600" },
  link: { paddingVertical: 8, alignItems: "center" },
  linkText: { color: colors.primary, fontSize: 16, fontWeight: "500" },
  inactive: { opacity: 0.5 },
});
