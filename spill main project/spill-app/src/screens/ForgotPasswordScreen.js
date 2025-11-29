import React, { useState } from "react";
import { View, TextInput } from "react-native";
import Text from "../components/Text";
import Button from "../components/Button";
import { useTheme } from "../theme/ThemeProvider";

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.primary, padding: 24 }}>
      <Text style={{ fontSize: 26, fontWeight: "bold", marginBottom: 14 }}>Reset Password</Text>
      <TextInput
        style={{ backgroundColor: theme.colors.surface, color: theme.colors.text, borderRadius: 8, marginBottom: 18, padding: 14 }}
        placeholder="Email"
        placeholderTextColor={theme.colors.secondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <Button>Send OTP</Button>
    </View>
  );
}
