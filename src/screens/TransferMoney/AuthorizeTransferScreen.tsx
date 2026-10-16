
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";

import { transactionService } from "@/services/transactionService";
import styles from "./authorizeStyles";

type AuthState = "ready" | "authenticating" | "processing";

export default function AuthorizeTransferScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    beneficiaryName?: string;
    beneficiaryBank?: string;
    beneficiaryAccount?: string;
    beneficiaryId?: string;
    note?: string;
    riskScore?: string;
    riskLevel?: string;
  }>();

  const amount = Number(params.amount ?? 0);
  const beneficiaryName = params.beneficiaryName ?? "Beneficiary";
  const beneficiaryBank = params.beneficiaryBank ?? "Bank";
  const beneficiaryAccount = params.beneficiaryAccount ?? "••••";
  const beneficiaryId = params.beneficiaryId ?? "";
  const note = params.note ?? "";

  // Never display a fabricated score if no assessment was passed.
  const riskScore = params.riskScore ?? "—";
  const riskLevel = (params.riskLevel ?? "NOT VERIFIED").toUpperCase();

  const isBlocked = riskLevel === "HIGH" || riskLevel === "BLOCK";
  const assessmentAvailable =
    params.riskScore !== undefined &&
    params.riskLevel !== undefined &&
    !isBlocked;

  const [authState, setAuthState] = useState<AuthState>("ready");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometric");

  const processing = authState === "processing";
  const authenticating = authState === "authenticating";

  useEffect(() => {
    const checkBiometricSupport = async () => {
      try {
        const hasHardware =
          await LocalAuthentication.hasHardwareAsync();
        const isEnrolled =
          await LocalAuthentication.isEnrolledAsync();
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();

        setBiometricAvailable(hasHardware && isEnrolled);

        if (
          types.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
          )
        ) {
          setBiometricLabel("Face Authentication");
        } else if (
          types.includes(
            LocalAuthentication.AuthenticationType.FINGERPRINT
          )
        ) {
          setBiometricLabel("Fingerprint");
        } else if (
          types.includes(
            LocalAuthentication.AuthenticationType.IRIS
          )
        ) {
          setBiometricLabel("Iris Authentication");
        }
      } catch (error) {
        console.warn("Biometric availability check failed:", error);
        setBiometricAvailable(false);
      }
    };

    checkBiometricSupport();
  }, []);

  const processTransfer = async () => {
    if (authState === "processing") return;

    // Fail closed if the amount or assessment is invalid.
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Please return and enter a valid amount.");
      return;
    }

    if (!assessmentAvailable) {
      Alert.alert(
        "Security assessment required",
        "A valid fraud assessment is required before continuing. Return to the fraud check and try again."
      );
      return;
    }

    setAuthState("processing");

    try {
      await transactionService.createTransaction({
        title: `Transfer to ${beneficiaryName}`,
        category: "Transfer",
        amount,
        type: "expense",
        status: "Completed",
        note,
      });

      router.replace({
        pathname: "/transfer/success",
        params: {
          amount: amount.toString(),
          beneficiaryName,
          beneficiaryBank,
          beneficiaryAccount,
          note,
          riskScore,
        },
      } as any);
    } catch (error: any) {
      console.error("Transaction creation error:", error);

      Alert.alert(
        "Transfer Failed",
        error?.response?.data?.detail ??
          error?.response?.data?.message ??
          error?.message ??
          "Could not save the transaction. Please try again."
      );

      setAuthState("ready");
    }
  };

  const handleBiometricAuth = async () => {
    if (authState !== "ready") return;

    if (isBlocked) {
      Alert.alert(
        "Transfer blocked",
        "Twin Shield flagged this transaction as high risk. Return to review the transaction."
      );
      return;
    }

    if (!assessmentAvailable) {
      Alert.alert(
        "Security assessment required",
        "Please complete the fraud check before authorizing."
      );
      return;
    }

    if (!biometricAvailable) {
      Alert.alert(
        "Biometric unavailable",
        "Biometric authentication is not configured on this device. OTP authorization is deferred."
      );
      return;
    }

    try {
      setAuthState("authenticating");

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authorize SecureWealth Transfer",
        cancelLabel: "Cancel",
        fallbackLabel: "Use device passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        await processTransfer();
      } else {
        setAuthState("ready");
      }
    } catch (error) {
      console.error("Biometric authentication failed:", error);
      setAuthState("ready");

      Alert.alert(
        "Authentication failed",
        "Your identity could not be verified. Please try again."
      );
    }
  };

  const handleOTP = () => {
    Alert.alert(
      "OTP deferred",
      "OTP authorization has not been implemented yet."
    );
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            disabled={processing}
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color="#0F172A"
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Authorize Transfer</Text>
            <Text style={styles.headerSubtitle}>Final security step</Text>
          </View>

          <View style={styles.secureBadge}>
            <MaterialCommunityIcons
              name="shield-check"
              size={18}
              color="#16A34A"
            />
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.transactionCard}>
            <Text style={styles.sendingLabel}>YOU'RE AUTHORIZING</Text>

            <Text style={styles.amount}>
              ₹{amount.toLocaleString("en-IN")}
            </Text>

            <Text style={styles.toLabel}>to</Text>
            <Text style={styles.beneficiaryName}>{beneficiaryName}</Text>

            <Text style={styles.bank}>
              {beneficiaryBank} • {beneficiaryAccount}
            </Text>
          </View>

          <View style={styles.shieldCard}>
            <View style={styles.shieldIcon}>
              <MaterialCommunityIcons
                name={isBlocked ? "shield-alert" : "shield-check"}
                size={23}
                color={isBlocked ? "#DC2626" : "#16A34A"}
              />
            </View>

            <View style={styles.shieldInfo}>
              <Text style={styles.shieldTitle}>
                {isBlocked
                  ? "Transfer Blocked"
                  : assessmentAvailable
                    ? "Fraud Assessment Received"
                    : "Assessment Required"}
              </Text>

              <Text style={styles.shieldText}>
                {isBlocked
                  ? "High-risk transaction. Authorization is disabled."
                  : assessmentAvailable
                    ? "Rule-based prototype risk assessment"
                    : "Return to the fraud check before proceeding."}
              </Text>
            </View>

            <View style={styles.scoreBadge}>
              <Text style={styles.score}>{riskScore}/100</Text>
              <Text style={styles.risk}>{riskLevel}</Text>
            </View>
          </View>

          <View style={styles.authSection}>
            <LinearGradient
              colors={["#EEF4FF", "#F8FAFF"]}
              style={styles.biometricCircleOuter}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={
                  processing ||
                  authenticating ||
                  isBlocked ||
                  !assessmentAvailable ||
                  !biometricAvailable
                }
                onPress={handleBiometricAuth}
                style={styles.biometricCircle}
              >
                {authenticating ? (
                  <ActivityIndicator size="large" color="#2563EB" />
                ) : (
                  <MaterialCommunityIcons
                    name="fingerprint"
                    size={70}
                    color={
                      isBlocked || !assessmentAvailable
                        ? "#94A3B8"
                        : "#2563EB"
                    }
                  />
                )}
              </TouchableOpacity>
            </LinearGradient>

            <Text style={styles.authTitle}>
              {authenticating
                ? "Verifying identity..."
                : isBlocked
                  ? "Transfer cannot proceed"
                  : "Confirm it's you"}
            </Text>

            <Text style={styles.authDescription}>
              {isBlocked
                ? "Return to the previous screen to review the transaction."
                : !assessmentAvailable
                  ? "Complete the fraud assessment before authorizing."
                  : biometricAvailable
                    ? `Use ${biometricLabel} to continue.`
                    : "Biometrics are unavailable. OTP authorization is deferred."}
            </Text>
          </View>

          <TouchableOpacity
            disabled={
              processing ||
              authenticating ||
              isBlocked ||
              !assessmentAvailable ||
              !biometricAvailable
            }
            activeOpacity={0.85}
            onPress={handleBiometricAuth}
            style={[
              styles.authorizeButton,
              (!biometricAvailable ||
                isBlocked ||
                !assessmentAvailable) &&
                styles.authorizeButtonDisabled,
            ]}
          >
            {processing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.authorizeText}>
                  Processing Transaction...
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="fingerprint"
                  size={23}
                  color={
                    biometricAvailable &&
                    !isBlocked &&
                    assessmentAvailable
                      ? "#FFFFFF"
                      : "#94A3B8"
                  }
                />
                <Text
                  style={[
                    styles.authorizeText,
                    (!biometricAvailable ||
                      isBlocked ||
                      !assessmentAvailable) &&
                      styles.authorizeTextDisabled,
                  ]}
                >
                  {isBlocked
                    ? "Transfer Blocked"
                    : !assessmentAvailable
                      ? "Assessment Required"
                      : `Authorize with ${biometricLabel}`}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!processing && !isBlocked && (
            <>
              <View style={styles.orRow}>
                <View style={styles.line} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.line} />
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleOTP}
                style={styles.otpButton}
              >
                <MaterialCommunityIcons
                  name="message-lock-outline"
                  size={20}
                  color="#2563EB"
                />
                <Text style={styles.otpText}>OTP (Coming Later)</Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color="#2563EB"
                />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={13}
              color="#64748B"
            />
            <Text style={styles.footerText}>
              This prototype does not move real money. Device authentication
              does not replace backend authorization.
            </Text>
          </View>
        </View>

        {processing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingCard}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.processingTitle}>
                Saving Transaction
              </Text>
              <Text style={styles.processingText}>
                Please wait while the prototype records the transaction.
              </Text>
              <View style={styles.processingSecurity}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={16}
                  color="#16A34A"
                />
                <Text style={styles.processingSecurityText}>
                  SecureWealth Twin Prototype
                </Text>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}
