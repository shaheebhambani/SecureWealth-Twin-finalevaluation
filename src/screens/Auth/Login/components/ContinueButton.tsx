import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from "react-native";

interface ContinueButtonProps {
  onContinuePress: () => void | Promise<void>;
  isSendingOTP: boolean;
}

export default function ContinueButton({
  onContinuePress,
  isSendingOTP,
}: ContinueButtonProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        void onContinuePress();
      }}
      disabled={isSendingOTP}
      accessibilityRole="button"
      accessibilityLabel="Continue"
      style={{
        backgroundColor: isSendingOTP ? "#93C5FD" : "#2563EB",
        marginTop: 24,
        height: 56,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        opacity: isSendingOTP ? 0.8 : 1,
      }}
    >
      {isSendingOTP && (
        <ActivityIndicator
          color="#FFFFFF"
          size="small"
          style={{ marginRight: 10 }}
        />
      )}

      <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
        {isSendingOTP ? "Please wait..." : "Continue"}
      </Text>
    </TouchableOpacity>
  );
}
