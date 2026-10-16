import React from "react";
import { View, Text, TextInput } from "react-native";

interface MobileInputProps {
  mobile: string;
  onMobileChange: (value: string) => void;
}

export default function MobileInput({
  mobile,
  onMobileChange,
}: MobileInputProps) {
  return (
    <View>
      <Text style={{ fontWeight: "700", marginBottom: 8 }}>
        Mobile Number
      </Text>

      <View
        style={{
          borderWidth: 1,
          borderColor: "#CBD5E1",
          borderRadius: 16,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          height: 56,
        }}
      >
        <Text style={{ fontSize: 16 }}>+91</Text>

        <TextInput
          value={mobile}
          onChangeText={onMobileChange}
          keyboardType="phone-pad"
          placeholder="Enter mobile number"
          placeholderTextColor="#94A3B8"
          style={{ flex: 1, marginLeft: 12, fontSize: 16 }}
          maxLength={10}
          accessibilityLabel="Mobile number"
        />
      </View>
    </View>
  );
}
