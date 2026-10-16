
import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";

import styles from "./reviewStyles";

export default function ReviewTransferScreen() {
  const params = useLocalSearchParams<{
    amount?: string;
    beneficiaryName?: string;
    beneficiaryBank?: string;
    beneficiaryAccount?: string;
    note?: string;
    beneficiaryId?: string;
    originalAmount?: string;
    originalCurrency?: string;
  }>();

  const amount = Number(params.amount ?? 0);
  const originalAmount = Number(params.originalAmount ?? 0);
  const originalCurrency = params.originalCurrency ?? "INR";

  const beneficiaryName = params.beneficiaryName ?? "Beneficiary";
  const beneficiaryBank = params.beneficiaryBank ?? "Bank";
  const beneficiaryAccount = params.beneficiaryAccount ?? "••••";
  const beneficiaryId = params.beneficiaryId ?? "";
  const note =
    params.note && params.note.length > 0
      ? params.note
      : "No payment note";

  const formatINR = (value: number) =>
    `\u20B9${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;

  const handleConfirm = () => {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    router.push({
      pathname: "/transfer/fraud-check",
      params: {
        amount: amount.toString(),
        beneficiaryName,
        beneficiaryBank,
        beneficiaryAccount,
        note,
        beneficiaryId,
        originalAmount: originalAmount.toString(),
        originalCurrency,
      },
    } as any);
  };

  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F8FAFC"
      />

      <SafeAreaView
        style={styles.container}
        edges={["top"]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="chevron-back"
                size={23}
                color="#0F172A"
              />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>
                Review Transfer
              </Text>

              <Text style={styles.headerSubtitle}>
                Check everything carefully
              </Text>
            </View>

            <View style={styles.headerButton}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={22}
                color="#16A34A"
              />
            </View>
          </View>

          {/* TRANSFER AMOUNT */}
          <LinearGradient
            colors={["#2563EB", "#4F46E5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroLabel}>
              YOU'RE SENDING
            </Text>

            <Text style={styles.heroAmount}>
              {formatINR(amount)}
            </Text>

            <View style={styles.heroRecipient}>
              <View style={styles.heroAvatar}>
                <MaterialCommunityIcons
                  name="account"
                  size={24}
                  color="#FFFFFF"
                />
              </View>

              <View>
                <Text style={styles.heroTo}>To</Text>

                <Text style={styles.heroName}>
                  {beneficiaryName}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* TRANSFER DETAILS */}
          <Text style={styles.sectionLabel}>
            TRANSFER DETAILS
          </Text>

          <View style={styles.detailsCard}>
            <DetailRow
              icon="account-outline"
              label="Recipient"
              value={beneficiaryName}
            />

            <DetailRow
              icon="bank-outline"
              label="Bank"
              value={beneficiaryBank}
            />

            <DetailRow
              icon="credit-card-outline"
              label="Account"
              value={beneficiaryAccount}
            />

            <DetailRow
              icon="wallet-outline"
              label="Pay From"
              value={"SecureWealth \u2022\u2022\u2022\u2022 8294"}
            />

            <DetailRow
              icon="message-text-outline"
              label="Note"
              value={note}
            />

            <DetailRow
              icon="cash"
              label="Transfer Fee"
              value="FREE"
              success
              last
            />
          </View>

          {/* ORIGINAL AMOUNT, IF CONVERTED */}
          {originalCurrency !== "INR" && (
            <>
              <Text style={styles.sectionLabel}>
                CURRENCY DETAILS
              </Text>

              <View style={styles.detailsCard}>
                <DetailRow
                  icon="cash-multiple"
                  label="Original Amount"
                  value={`${originalAmount.toLocaleString("en-IN")} ${originalCurrency}`}
                />

                <DetailRow
                  icon="cash"
                  label="Amount in INR"
                  value={formatINR(amount)}
                  success
                  last
                />
              </View>
            </>
          )}

          {/* TOTAL */}
          <View style={styles.totalCard}>
            <View>
              <Text style={styles.totalLabel}>
                Total Debit
              </Text>

              <Text style={styles.totalSubtext}>
                Includes {"\u20B9"}0 transfer fee
              </Text>
            </View>

            <Text style={styles.totalAmount}>
              {formatINR(amount)}
            </Text>
          </View>

          {/* REAL FRAUD CHECK IS THE NEXT STEP */}
          <View
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 16,
              padding: 16,
              marginTop: 20,
              marginBottom: 20,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={23}
              color="#2563EB"
            />

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: "#1E3A8A",
                  marginBottom: 5,
                }}
              >
                Verify before proceeding
              </Text>

              <Text
                style={{
                  fontSize: 13,
                  lineHeight: 19,
                  color: "#475569",
                }}
              >
                Continue to Twin Shield for the fraud assessment.
                No safety score or verification result is assumed
                on this review screen.
              </Text>
            </View>
          </View>

          {/* CONTINUE TO FRAUD CHECK */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={!Number.isFinite(amount) || amount <= 0}
          >
            <MaterialCommunityIcons
              name="shield-lock-outline"
              size={20}
              color="#FFFFFF"
            />

            <Text style={styles.confirmButtonText}>
              Verify with Twin Shield
            </Text>

            <Ionicons
              name="arrow-forward"
              size={19}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.footer}>
            <MaterialCommunityIcons
              name="lock-outline"
              size={13}
              color="#64748B"
            />

            <Text style={styles.footerText}>
              The transfer must pass the security assessment
              before authorization.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
  success = false,
  last = false,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
  success?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        last && styles.detailRowLast,
      ]}
    >
      <View style={styles.detailLeft}>
        <View style={styles.detailIcon}>
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color="#64748B"
          />
        </View>

        <Text style={styles.detailLabel}>
          {label}
        </Text>
      </View>

      <Text
        numberOfLines={2}
        style={[
          styles.detailValue,
          success && styles.successValue,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
