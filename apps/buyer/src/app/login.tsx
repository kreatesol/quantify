import { PHONE_COUNTRY_DIAL_CODES, parsePhone, SUPPORTED_PHONE_COUNTRIES, type PhoneCountry } from "@quantify/shared";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, errorMessage } from "../lib/api";
import { Body, Button, colors, ErrorText, Field, Screen, Title } from "../lib/ui";

const COUNTRY_LABELS: Record<PhoneCountry, string> = { IN: "India", US: "United States" };

export default function Login() {
  const [country, setCountry] = useState<PhoneCountry>("IN");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const phone = parsePhone(number, SUPPORTED_PHONE_COUNTRIES, country);
    if (!phone.ok) return setError("Enter a valid mobile number.");
    setError(null);
    setBusy(true);
    try {
      const result = await api.requestCode(phone.e164);
      router.push({ pathname: "/verify", params: { phone: result.phone } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Title>Quantify</Title>
      <Body>Enter your mobile number. We'll text you a code to sign in. No password needed.</Body>

      <View style={styles.countries} accessibilityRole="radiogroup">
        {SUPPORTED_PHONE_COUNTRIES.map((code) => (
          <Pressable
            key={code}
            onPress={() => setCountry(code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: country === code }}
            style={[styles.country, country === code && styles.countrySelected]}
          >
            <Text style={[styles.countryText, country === code && styles.countryTextSelected]}>
              {COUNTRY_LABELS[code]} {PHONE_COUNTRY_DIAL_CODES[code]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field
        value={number}
        onChangeText={setNumber}
        placeholder={country === "IN" ? "98765 43210" : "(415) 555-2671"}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        accessibilityLabel="Mobile number"
        onSubmitEditing={submit}
      />
      <ErrorText>{error}</ErrorText>
      <Button label="Send code" onPress={submit} busy={busy} disabled={!number.trim()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  countries: { flexDirection: "row", gap: 8 },
  country: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  countrySelected: { borderColor: colors.primary, backgroundColor: "#EAF2FF" },
  countryText: { fontSize: 15, color: colors.text },
  countryTextSelected: { color: colors.primary, fontWeight: "600" },
});
