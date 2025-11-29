import React from "react";
import { TouchableOpacity, Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function Button({ children, style, ...props }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[{
        backgroundColor: theme.colors.accent,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginVertical: 10,
        shadowColor: theme.colors.accent,
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }, style]}
      activeOpacity={0.9}
      {...props}
    >
      <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>{children}</Text>
    </TouchableOpacity>
  );
}
