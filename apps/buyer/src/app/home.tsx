import { Redirect } from "expo-router";
import { useSession } from "../lib/session";
import { Body, Button, Screen, Title } from "../lib/ui";

export default function Home() {
  const { session, signOut } = useSession();
  if (session.status !== "signed-in") return <Redirect href="/login" />;

  return (
    <Screen>
      <Title>Welcome</Title>
      <Body>Signed in as {session.user.phone}.</Body>
      <Body>Receipt scanning and your spend dashboard are coming next.</Body>
      <Button label="Sign out" variant="link" onPress={signOut} />
    </Screen>
  );
}
