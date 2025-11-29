import React, { useState } from "react";
import { View, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Text from "../components/Text";
import Button from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";
import { register } from "../api/auth";

export default function RegisterFinalScreen({ navigation, route }) {
  const { form, selfie } = route.params || {};
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      setLoading(true);
      // Optionally: include selfie in the register() call if you update Django
      await register(form);
      Alert.alert("Registration Successful", "You can now log in.");
      navigation.replace("Login");
    } catch (err) {
      Alert.alert("Error", err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.primary }}>
      <View style={styles.container}>
        <Text style={{ fontSize: 24, marginBottom: 24, color: theme.colors.text, textAlign: "center" }}>
          Ready to complete your registration?
        </Text>
        <Button onPress={handleRegister} disabled={loading} style={styles.button}>
          {loading ? <ActivityIndicator color="#fff" /> : "Finish Sign Up"}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  button: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    paddingVertical: 18,
  },
});
