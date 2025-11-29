import React, { useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Text from "../components/Text";
import Button from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { routeWithSelfieStatus } from "../nav/routeWithSelfieStatus";

export default function AppealPendingScreen({ navigation }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    await routeWithSelfieStatus(navigation);
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.primary }]}>
      <View style={styles.container}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="time" size={28} color={theme.colors.accent} style={{ marginBottom: 8 }} />
          <Text style={[styles.title, { color: theme.colors.text }]}>Appeal Submitted</Text>
          <Text style={[styles.subtitle, { color: theme.colors.secondary }]}>
            A moderator is reviewing your appeal. We’ll unlock your account if approved or reset your attempts.
          </Text>

          <Button
            onPress={refresh}
            style={[styles.button, { backgroundColor: theme.colors.accent }]}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.row}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={[styles.btnText, { color: "#fff", marginLeft: 10 }]}>Checking…</Text>
              </View>
            ) : (
              <Text style={[styles.btnText, { color: "#fff" }]}>Refresh Status</Text>
            )}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, alignItems: "center" },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 20, lineHeight: 20 },
  button: { width: "100%", borderRadius: 14, paddingVertical: 16 },
  btnText: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
