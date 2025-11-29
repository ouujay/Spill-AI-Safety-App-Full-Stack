import React from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function Card({ style, ...props }) {
  const { theme } = useTheme();
  return (
    <View
      style={[{
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        marginVertical: 8,
        shadowColor: theme.colors.secondary,
        shadowOpacity: 0.05,
        shadowRadius: 8,
      }, style]}
      {...props}
    />
  );
}
