
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { useBeneficiaries } from "@/context/BeneficiaryContext";
import { authService } from "@/services/authService";
import { verificationService } from "@/services/verificationService";

import styles from "./styles";

const quickAmounts = [500, 1000, 2500, 5000];
const ACCOUNT_BALANCE = 284500;

type Currency = "INR" | "USD" | "EUR" | "GBP";

const formatINR = (value: number) =>
  `\u20B9${Math.max(0, value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export default function TransferMoneyScreen() {
  const {
    beneficiaries,
    selectedBeneficiary,
    selectBeneficiary,
  } = useBeneficiaries();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [convertedAmountInr, setConvertedAmountInr] = useState(0);
  const [conversionRate, setConversionRate] = useState(1);
  const [loadingConversion, setLoadingConversion] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const [profile, setProfile] = useState<{
    email: string | null;
    phone_number: string | null;
    uid: string;
  } | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [emailVerification, setEmailVerification] = useState<{
    verified: boolean;
    checking: boolean;
  } | null>(null);

  const [phoneVerification, setPhoneVerification] = useState<{
    verified: boolean;
    checking: boolean;
  } | null>(null);

  const numericAmount = Number(amount || 0);

  const canContinue = useMemo(
    () =>
      numericAmount > 0 &&
      selectedBeneficiary !== null &&
      !loadingConversion &&
      !conversionError &&
      convertedAmountInr > 0 &&
      convertedAmountInr <= ACCOUNT_BALANCE,
    [
      numericAmount,
      selectedBeneficiary,
      loadingConversion,
      conversionError,
      convertedAmountInr,
    ]
  );

  const handleAmountChange = (value: string) => {
    setAmount(value.replace(/[^0-9]/g, ""));
  };

  const convertAmountToInr = useCallback(
    async (value: number, selectedCurrency: Currency) => {
      if (value <= 0) {
        setConvertedAmountInr(0);
        setConversionRate(1);
        setConversionError(null);
        setLoadingConversion(false);
        return;
      }

      if (selectedCurrency === "INR") {
        setConvertedAmountInr(value);
        setConversionRate(1);
        setConversionError(null);
        setLoadingConversion(false);
        return;
      }

      setLoadingConversion(true);
      setConversionError(null);

      try {
        const response = await verificationService.convertAmount(
          value,
          selectedCurrency,
          "INR"
        );

        const converted = Number(response.converted_amount);

        if (!Number.isFinite(converted) || converted <= 0) {
          throw new Error("The currency conversion returned an invalid amount.");
        }

        setConvertedAmountInr(converted);
        setConversionRate(converted / value);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Currency conversion failed.";

        setConversionError(message);
        setConvertedAmountInr(0);
        setConversionRate(0);
      } finally {
        setLoadingConversion(false);
      }
    },
    []
  );

  useEffect(() => {
    void convertAmountToInr(numericAmount, currency);
  }, [numericAmount, currency, convertAmountToInr]);

  useEffect(() => {
    let active = true;

    const fetchProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);

      try {
        const data = await authService.getProfile();
        if (active) setProfile(data);
      } catch (error) {
        if (active) {
          setProfile(null);
          setProfileError(
            error instanceof Error
              ? error.message
              : "Failed to load your profile."
          );
        }
      } finally {
        if (active) setLoadingProfile(false);
      }
    };

    void fetchProfile();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!profile?.email) {
      setEmailVerification(null);
      return;
    }

    let active = true;
    setEmailVerification({ verified: false, checking: true });

    verificationService
      .verifyEmail(profile.email)
      .then((result) => {
        if (active) {
          setEmailVerification({
            verified: Boolean(result.deliverable),
            checking: false,
          });
        }
      })
      .catch((error) => {
        if (active) {
          setEmailVerification({ verified: false, checking: false });
        }
        console.warn("Email verification failed:", error);
      });

    return () => {
      active = false;
    };
  }, [profile?.email]);

  useEffect(() => {
    if (!profile?.phone_number) {
      setPhoneVerification(null);
      return;
    }

    let active = true;
    setPhoneVerification({ verified: false, checking: true });

    verificationService
      .verifyPhone(profile.phone_number)
      .then((result) => {
        if (active) {
          setPhoneVerification({
            verified: Boolean(result.valid),
            checking: false,
          });
        }
      })
      .catch((error) => {
        if (active) {
          setPhoneVerification({ verified: false, checking: false });
        }
        console.warn("Phone verification failed:", error);
      });

    return () => {
      active = false;
    };
  }, [profile?.phone_number]);

  const handleCurrencyChange = (value: Currency) => {
    setCurrency(value);
  };

  const handleContinue = () => {
    if (!selectedBeneficiary) {
      Alert.alert("Choose recipient", "Please select a recipient first.");
      return;
    }

    if (numericAmount <= 0) {
      Alert.alert("Invalid amount", "Enter an amount greater than zero.");
      return;
    }

    if (loadingConversion || conversionError || convertedAmountInr <= 0) {
      Alert.alert(
        "Conversion unavailable",
        "Please wait for the amount conversion to finish successfully."
      );
      return;
    }

    if (convertedAmountInr > ACCOUNT_BALANCE) {
      Alert.alert(
        "Insufficient balance",
        "The transfer amount exceeds the displayed available balance."
      );
      return;
    }

    router.push({
      pathname: "/transfer/review",
      params: {
        amount: convertedAmountInr.toString(),
        beneficiaryName: selectedBeneficiary.name,
        beneficiaryBank: selectedBeneficiary.bank,
        beneficiaryAccount: selectedBeneficiary.account,
        beneficiaryId: selectedBeneficiary.id,
        note,
        originalAmount: amount,
        originalCurrency: currency,
      },
    } as any);
  };

  const retryEmailVerification = async () => {
    if (!profile?.email) return;

    setEmailVerification({ verified: false, checking: true });

    try {
      const result = await verificationService.verifyEmail(profile.email);
      setEmailVerification({
        verified: Boolean(result.deliverable),
        checking: false,
      });
    } catch {
      setEmailVerification({ verified: false, checking: false });
      Alert.alert("Verification failed", "Could not verify your email.");
    }
  };

  const retryPhoneVerification = async () => {
    if (!profile?.phone_number) return;

    setPhoneVerification({ verified: false, checking: true });

    try {
      const result = await verificationService.verifyPhone(
        profile.phone_number
      );
      setPhoneVerification({
        verified: Boolean(result.valid),
        checking: false,
      });
    } catch {
      setPhoneVerification({ verified: false, checking: false });
      Alert.alert("Verification failed", "Could not verify your phone.");
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <SafeAreaView style={styles.container} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.back()}
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={23} color="#0F172A" />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Transfer Money</Text>
                <Text style={styles.headerSubtitle}>Secure payment</Text>
              </View>

              <View style={styles.headerButton}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={22}
                  color="#16A34A"
                />
              </View>
            </View>

            <View style={styles.securityStrip}>
              <View style={styles.securityIcon}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={19}
                  color="#16A34A"
                />
              </View>

              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>Twin Shield Active</Text>
                <Text style={styles.securitySubtitle}>
                  This transfer will be checked before payment.
                </Text>
              </View>

              <View style={styles.activeDot} />
            </View>

            <Text style={styles.sectionLabel}>PAY FROM</Text>

            <View style={styles.accountCard}>
              <View style={styles.bankIcon}>
                <MaterialCommunityIcons
                  name="bank-outline"
                  size={24}
                  color="#2563EB"
                />
              </View>

              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>SecureWealth Account</Text>
                <Text style={styles.accountNumber}>
                  Savings {"\u2022\u2022\u2022\u2022"} 8294
                </Text>
              </View>

              <View style={styles.accountBalanceContainer}>
                <Text style={styles.balanceLabel}>AVAILABLE</Text>
                <Text style={styles.accountBalance}>
                  {formatINR(ACCOUNT_BALANCE)}
                </Text>
              </View>

              <Ionicons
                name="chevron-down"
                size={18}
                color="#64748B"
                style={styles.accountChevron}
              />
            </View>

            <Text style={styles.sectionLabel}>ENTER AMOUNT</Text>

            <LinearGradient
              colors={["#EEF4FF", "#F8FAFF"]}
              style={styles.amountCard}
            >
              <Text style={styles.amountHelper}>
                How much would you like to send?
              </Text>

              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>{"\u20B9"}</Text>

                <TextInput
                  value={amount}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={10}
                  style={styles.amountInput}
                  accessibilityLabel="Transfer amount"
                />
              </View>

              <Text style={styles.availableBalance}>
                Available balance {formatINR(ACCOUNT_BALANCE)}
              </Text>

              <View style={styles.quickAmountRow}>
                {quickAmounts.map((value) => {
                  const active = numericAmount === value;

                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setAmount(value.toString())}
                      style={[
                        styles.quickAmountButton,
                        active && styles.quickAmountButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickAmountText,
                          active && styles.quickAmountTextActive,
                        ]}
                      >
                        +{formatINR(value)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.currencySelectorContainer}>
                <Text style={styles.currencySelectorLabel}>Currency:</Text>

                {(["INR", "USD", "EUR", "GBP"] as Currency[]).map((item) => (
                  <TouchableOpacity
                    key={item}
                    activeOpacity={0.8}
                    style={[
                      styles.currencySelectorButton,
                      currency === item &&
                        styles.currencySelectorButtonActive,
                    ]}
                    onPress={() => handleCurrencyChange(item)}
                  >
                    <Text style={styles.currencySelectorText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {currency !== "INR" && (
                <View style={styles.conversionInfoContainer}>
                  <Text style={styles.conversionInfoText}>
                    {amount || "0"} {currency} ={" "}
                    {loadingConversion
                      ? "Calculating..."
                      : conversionError
                        ? "Conversion unavailable"
                        : formatINR(convertedAmountInr)}
                  </Text>

                  {!loadingConversion && conversionError && (
                    <Text style={styles.conversionInfoErrorText}>
                      {conversionError}
                    </Text>
                  )}

                  {!loadingConversion &&
                    !conversionError &&
                    conversionRate > 0 && (
                      <Text style={styles.conversionInfoLoadingText}>
                        Rate: 1 {currency} ={" "}
                        {formatINR(conversionRate).replace("\u20B9", "")}
                      </Text>
                    )}
                </View>
              )}
            </LinearGradient>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabelNoMargin}>SEND TO</Text>

              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.addBeneficiaryButton}
                onPress={() => router.push("/beneficiaries" as any)}
              >
                <Ionicons name="add" size={16} color="#2563EB" />
                <Text style={styles.addBeneficiaryText}>Add New</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.beneficiaryContainer}
            >
              {beneficiaries.map((beneficiary) => {
                const selected =
                  selectedBeneficiary?.id === beneficiary.id;

                return (
                  <TouchableOpacity
                    key={beneficiary.id}
                    activeOpacity={0.8}
                    onPress={() => selectBeneficiary(beneficiary)}
                    style={[
                      styles.beneficiaryCard,
                      selected && styles.beneficiaryCardSelected,
                    ]}
                  >
                    {selected && (
                      <View style={styles.selectedCheck}>
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color="#FFFFFF"
                        />
                      </View>
                    )}

                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: beneficiary.color },
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {beneficiary.initials}
                      </Text>
                    </View>

                    <Text
                      numberOfLines={1}
                      style={styles.beneficiaryName}
                    >
                      {beneficiary.name}
                    </Text>

                    <Text style={styles.beneficiaryBank}>
                      {beneficiary.bank}
                    </Text>

                    <Text style={styles.beneficiaryAccount}>
                      {beneficiary.account}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>PAYMENT NOTE</Text>

            <View style={styles.noteContainer}>
              <MaterialCommunityIcons
                name="message-text-outline"
                size={21}
                color="#64748B"
              />

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)"
                placeholderTextColor="#94A3B8"
                maxLength={80}
                style={styles.noteInput}
              />

              <Text style={styles.noteCounter}>{note.length}/80</Text>
            </View>

            {canContinue && selectedBeneficiary && (
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <MaterialCommunityIcons
                    name="lightning-bolt"
                    size={18}
                    color="#2563EB"
                  />
                  <Text style={styles.previewTitle}>Transfer Preview</Text>
                </View>

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Recipient</Text>
                  <Text style={styles.previewValue}>
                    {selectedBeneficiary.name}
                  </Text>
                </View>

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Amount in INR</Text>
                  <Text style={styles.previewAmount}>
                    {formatINR(convertedAmountInr)}
                  </Text>
                </View>

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Original Amount</Text>
                  <Text style={styles.previewAmount}>
                    {amount} {currency}
                  </Text>
                </View>

                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Transfer Fee</Text>
                  <Text style={styles.freeText}>FREE</Text>
                </View>
              </View>
            )}

            {!loadingProfile && profile && (
              <View style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <MaterialCommunityIcons
                    name="account-circle-outline"
                    size={18}
                    color="#2563EB"
                  />
                  <Text style={styles.profileTitle}>Your Profile</Text>
                </View>

                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Email</Text>
                  <Text style={styles.profileValue}>
                    {profile.email || "Not available"}
                  </Text>
                </View>

                <View style={styles.profileRow}>
                  <Text style={styles.profileLabel}>Phone</Text>
                  <Text style={styles.profileValue}>
                    {profile.phone_number || "Not available"}
                  </Text>
                </View>

                {emailVerification && (
                  <View style={styles.verificationRow}>
                    <Text style={styles.verificationLabel}>
                      Email Verified:
                    </Text>
                    <Text
                      style={[
                        styles.verificationValue,
                        emailVerification.verified &&
                          styles.verificationValueVerified,
                        !emailVerification.verified &&
                          styles.verificationValueNotVerified,
                      ]}
                    >
                      {emailVerification.checking
                        ? "Checking..."
                        : emailVerification.verified
                          ? "Yes"
                          : "No"}
                    </Text>

                    {!emailVerification.verified &&
                      !emailVerification.checking && (
                        <TouchableOpacity
                          style={styles.verificationActionButton}
                          onPress={retryEmailVerification}
                        >
                          <Text style={styles.verificationActionText}>
                            Re-check
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}

                {phoneVerification && (
                  <View style={styles.verificationRow}>
                    <Text style={styles.verificationLabel}>
                      Phone Verified:
                    </Text>
                    <Text
                      style={[
                        styles.verificationValue,
                        phoneVerification.verified &&
                          styles.verificationValueVerified,
                        !phoneVerification.verified &&
                          styles.verificationValueNotVerified,
                      ]}
                    >
                      {phoneVerification.checking
                        ? "Checking..."
                        : phoneVerification.verified
                          ? "Yes"
                          : "No"}
                    </Text>

                    {!phoneVerification.verified &&
                      !phoneVerification.checking && (
                        <TouchableOpacity
                          style={styles.verificationActionButton}
                          onPress={retryPhoneVerification}
                        >
                          <Text style={styles.verificationActionText}>
                            Re-check
                          </Text>
                        </TouchableOpacity>
                      )}
                  </View>
                )}
              </View>
            )}

            {profileError && (
              <Text style={styles.noteCounterError}>
                Profile information unavailable: {profileError}
              </Text>
            )}

            {loadingProfile && (
              <View style={{ paddingVertical: 12 }}>
                <ActivityIndicator color="#2563EB" />
              </View>
            )}

            <TouchableOpacity
              disabled={!canContinue}
              activeOpacity={0.85}
              onPress={handleContinue}
              style={[
                styles.continueButton,
                !canContinue && styles.continueButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.continueText,
                  !canContinue && styles.continueTextDisabled,
                ]}
              >
                Continue Securely
              </Text>

              <Ionicons
                name="arrow-forward"
                size={20}
                color={canContinue ? "#FFFFFF" : "#94A3B8"}
              />
            </TouchableOpacity>

            <View style={styles.footerSecurity}>
              <MaterialCommunityIcons
                name="lock-outline"
                size={14}
                color="#64748B"
              />
              <Text style={styles.footerSecurityText}>
                End-to-end encrypted {"\u2022"} Protected by Twin Shield
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
