import React from "react";
import { View } from "react-native";

import MobileInput from "./MobileInput";
import ContinueButton from "./ContinueButton";

interface LoginCardProps {
  mobile: string;
  onMobileChange: (value: string) => void;
  onContinuePress: () => void | Promise<void>;
  isSendingOTP: boolean;
}

export default function LoginCard({
  mobile,
  onMobileChange,
  onContinuePress,
  isSendingOTP,
}: LoginCardProps) {
  return (
    <View
      style={{
        marginTop: 28,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 20,
        shadowColor: "#000000",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 6,
      }}
    >
      <MobileInput
        mobile={mobile}
        onMobileChange={onMobileChange}
      />

      <ContinueButton
        onContinuePress={onContinuePress}
        isSendingOTP={isSendingOTP}
      />
    </View>
  );
}
