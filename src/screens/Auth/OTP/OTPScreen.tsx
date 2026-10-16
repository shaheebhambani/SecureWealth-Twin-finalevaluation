
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import OTPInput from "./components/OTPInput";
import ResendTimer from "./components/ResendTimer";
import VerifyButton from "./components/VerifyButton";

const RESEND_SECONDS = 30;

export default function OTPScreen() {
  const params = useLocalSearchParams();
  const mobile = params.mobile?.toString() || "";

  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [secondsRemaining, setSecondsRemaining] =
    useState(RESEND_SECONDS);
  const [resendCount, setResendCount] = useState(0);

  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setTimeout(() => {
      setSecondsRemaining((previous) => previous - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  const handleVerifyPress = async () => {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP.");
      return;
    }

    setIsVerifying(true);

    try {
      // Demo-only OTP for the hackathon presentation.
      if (otp === "123456") {
        router.replace("/(auth)/biometric-setup");
        return;
      }

      Alert.alert(
        "Incorrect OTP",
        "For this demo, enter 123456 to continue."
      );
    } catch (error) {
      Alert.alert("Verification failed", "Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    if (secondsRemaining > 0) return;

    setOtp("");
    setSecondsRemaining(RESEND_SECONDS);
    setResendCount((previous) => previous + 1);

    Alert.alert(
      "Demo OTP",
      "Use 123456 to continue in this demonstration."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>‹ Back</Text>
            </Pressable>

            <View style={styles.iconCircle}>
              <Text style={styles.icon}>✉</Text>
            </View>

            <Text style={styles.title}>Verify your number</Text>

            <Text style={styles.subtitle}>
              Enter the 6-digit verification code sent to
            </Text>

            {mobile ? (
              <Text style={styles.mobile}>{mobile}</Text>
            ) : (
              <Text style={styles.mobile}>your registered number</Text>
            )}

            <View style={styles.otpContainer}>
              <OTPInput value={otp} onChange={setOtp} />
            </View>

            <View style={styles.resendContainer}>
              {secondsRemaining > 0 ? (
                <Text style={styles.resendText}>
                  Resend code in {secondsRemaining}s
                </Text>
              ) : (
                <Pressable onPress={handleResend}>
                  <Text style={styles.resendLink}>Resend OTP</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <VerifyButton
                otp={otp}
                mobile={mobile}
                onPress={handleVerifyPress}
                isVerifying={isVerifying}
              />
            </View>

            <Text style={styles.footer}>
              SecureWealth Twin · Secure verification
            </Text>

            {resendCount > 0 && (
              <Text style={styles.resendCount}>
                Resend attempts: {resendCount}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  container: {
    paddingHorizontal: 26,
    paddingVertical: 28,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 30,
    paddingVertical: 6,
  },
  backText: {
    fontSize: 16,
    color: "#173B65",
    fontWeight: "600",
  },
  iconCircle: {
    height: 76,
    width: 76,
    borderRadius: 38,
    backgroundColor: "#E8F2FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 34,
    color: "#1769AA",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#102A43",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 23,
  },
  mobile: {
    fontSize: 16,
    color: "#102A43",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
  },
  otpContainer: {
    marginVertical: 12,
  },
  resendContainer: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  resendText: {
    color: "#64748B",
    fontSize: 14,
  },
  resendLink: {
    color: "#1769AA",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonContainer: {
    marginTop: 20,
  },
  footer: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 12,
    color: "#94A3B8",
  },
  resendCount: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
  },
});
