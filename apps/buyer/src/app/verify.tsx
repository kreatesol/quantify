import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { api, errorMessage } from "../lib/api";
import { useSession } from "../lib/session";
import { Body, Button, ErrorText, Field, Screen, Title } from "../lib/ui";

export default function Verify() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { signIn } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (value = code) => {
    if (!/^\d{6}$/.test(value)) return;
    setError(null);
    setBusy(true);
    try {
      const result = await api.verifyCode(phone, value);
      await signIn(result.token, result.user);
      router.replace("/home");
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    setNotice(null);
    try {
      await api.requestCode(phone);
      setNotice("A new code is on its way.");
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen>
      <Title>Enter the code</Title>
      <Body>We sent a 6-digit code to {phone}.</Body>
      <Field
        value={code}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, "").slice(0, 6);
          setCode(digits);
          if (digits.length === 6) submit(digits);
        }}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        accessibilityLabel="6-digit code"
        maxLength={6}
        autoFocus
      />
      <ErrorText>{error}</ErrorText>
      {notice ? <Body>{notice}</Body> : null}
      <Button label="Sign in" onPress={() => submit()} busy={busy} disabled={code.length !== 6} />
      <Button label="Send a new code" variant="link" onPress={resend} />
      <Button label="Use a different number" variant="link" onPress={() => router.back()} />
    </Screen>
  );
}
