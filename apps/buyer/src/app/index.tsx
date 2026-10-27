import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useSession } from "../lib/session";
import { colors } from "../lib/ui";

export default function Index() {
  const { session } = useSession();
  if (session.status === "loading") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Redirect href={session.status === "signed-in" ? "/home" : "/login"} />;
}
