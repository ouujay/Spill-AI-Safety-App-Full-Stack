import React from "react";
import { Text as RNText } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function Text({ style, ...props }) {
  const { theme } = useTheme();
  return (
    <RNText
      style={[{ color: theme.colors.text, fontFamily: "System" }, style]}
      {...props}
    />
  );
}
