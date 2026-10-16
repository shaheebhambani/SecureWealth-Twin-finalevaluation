
import React, { useRef } from "react";
import {
  View,
  TextInput,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";

type OTPInputProps = {
  value: string;
  onChange: (otp: string) => void;
};

export default function OTPInput({ value, onChange }: OTPInputProps) {
  const inputs = useRef<Array<TextInput | null>>([]);

  const digits = value.replace(/\D/g, "").slice(0, 6);

  const handleChange = (text: string, index: number) => {
    // Support pasting an entire six-digit OTP into any box.
    const cleaned = text.replace(/\D/g, "");

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6);
      onChange(pasted);

      const nextIndex = Math.min(pasted.length, 5);
      inputs.current[nextIndex]?.focus();
      return;
    }

    const next = digits.split("");

    if (cleaned.length === 1) {
      next[index] = cleaned;
      const updated = next.join("").slice(0, 6);
      onChange(updated);

      if (index < 5) {
        inputs.current[index + 1]?.focus();
      }
    } else {
      next[index] = "";
      onChange(next.join("").replace(/\s/g, ""));
    }
  };

  const handleKeyPress = (
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (event.nativeEvent.key === "Backspace") {
      if (digits[index]) {
        const next = digits.split("");
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        inputs.current[index - 1]?.focus();

        const next = digits.split("");
        next[index - 1] = "";
        onChange(next.join(""));
      }
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 30,
      }}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputs.current[index] = ref;
          }}
          value={digits[index] ?? ""}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(event) => handleKeyPress(event, index)}
          keyboardType="number-pad"
          maxLength={6}
          selectTextOnFocus
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          accessibilityLabel={`OTP digit ${index + 1}`}
          style={{
            width: 48,
            height: 56,
            borderWidth: 1,
            borderColor: "#CBD5E1",
            borderRadius: 12,
            textAlign: "center",
            fontSize: 22,
            color: "#0F172A",
            backgroundColor: "#FFFFFF",
          }}
        />
      ))}
    </View>
  );
}
