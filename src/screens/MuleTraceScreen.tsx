
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

const samples = [
  {
    id: "A-104",
    senders: 4,
    delay: 2,
    onward: true,
  },
  {
    id: "B-208",
    senders: 1,
    delay: 120,
    onward: false,
  },
  {
    id: "C-315",
    senders: 6,
    delay: 3,
    onward: true,
  },
];

export default function MuleTraceScreen() {
  const [selected, setSelected] = useState(samples[0]);
  const [scanned, setScanned] = useState(false);

  const highRisk =
    selected.senders >= 4 &&
    selected.delay <= 5 &&
    selected.onward;

  const mediumRisk =
    selected.senders >= 3 || selected.delay <= 10;

  const risk = highRisk ? "HIGH" : mediumRisk ? "MEDIUM" : "LOW";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <Text style={styles.eyebrow}>TWIN SHIELD • INVESTIGATION LAB</Text>
      <Text style={styles.title}>MuleTrace QuickScan</Text>
      <Text style={styles.subtitle}>
        Identify suspicious money-movement patterns in sample data.
      </Text>

      <Text style={styles.label}>SELECT SAMPLE ACCOUNT</Text>
      <View style={styles.row}>
        {samples.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              setSelected(item);
              setScanned(false);
            }}
            style={[
              styles.chip,
              selected.id === item.id && styles.activeChip,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                selected.id === item.id && styles.activeText,
              ]}
            >
              {item.id}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>ACCOUNT</Text>
        <Text style={styles.account}>{selected.id}</Text>
        <Text style={styles.muted}>Synthetic transaction profile</Text>

        <View style={styles.metricRow}>
          <Text>Distinct senders</Text>
          <Text style={styles.metric}>{selected.senders}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text>Time before onward transfer</Text>
          <Text style={styles.metric}>{selected.delay} min</Text>
        </View>
        <View style={styles.metricRow}>
          <Text>Funds moved onward</Text>
          <Text style={styles.metric}>{selected.onward ? "Yes" : "No"}</Text>
        </View>

        <Pressable style={styles.button} onPress={() => setScanned(true)}>
          <Text style={styles.buttonText}>⌕  Scan Account Patterns</Text>
        </Pressable>
      </View>

      {scanned && (
        <View style={styles.result}>
          <Text style={styles.label}>PATTERN ASSESSMENT</Text>
          <Text style={[
            styles.risk,
            { color: risk === "HIGH" ? "#DC2626" :
              risk === "MEDIUM" ? "#D97706" : "#059669" }
          ]}>
            {risk} RISK
          </Text>

          {selected.senders >= 4 && (
            <Text style={styles.finding}>
              • Multiple distinct senders detected
            </Text>
          )}
          {selected.delay <= 5 && selected.onward && (
            <Text style={styles.finding}>
              • Rapid onward movement of funds
            </Text>
          )}
          {!highRisk && !mediumRisk && (
            <Text style={styles.finding}>
              • No configured high-risk pattern detected
            </Text>
          )}

          <Text style={styles.disclaimer}>
            Demo assessment based on synthetic data and simple rules.
            This does not establish that an account is a mule account.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#F5F8FC", flexGrow: 1 },
  back: { color: "#2563EB", fontSize: 16, marginBottom: 24 },
  eyebrow: { color: "#0D9488", fontWeight: "800", fontSize: 11 },
  title: { fontSize: 28, fontWeight: "800", color: "#102A43", marginTop: 8 },
  subtitle: { color: "#64748B", marginTop: 8, marginBottom: 24, lineHeight: 21 },
  label: { color: "#64748B", fontSize: 11, fontWeight: "800", marginBottom: 10 },
  row: { flexDirection: "row", gap: 10, marginBottom: 20 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#E2E8F0" },
  activeChip: { backgroundColor: "#102A43" },
  chipText: { color: "#334155", fontWeight: "700" },
  activeText: { color: "#FFFFFF" },
  card: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 18, borderWidth: 1, borderColor: "#E2E8F0" },
  account: { fontSize: 25, fontWeight: "800", color: "#102A43" },
  muted: { color: "#64748B", marginTop: 4, marginBottom: 20 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", gap: 12 },
  metric: { fontWeight: "800", color: "#102A43" },
  button: { backgroundColor: "#0D9488", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 22 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  result: { backgroundColor: "#FFFFFF", padding: 20, borderRadius: 18, marginTop: 18, borderWidth: 1, borderColor: "#E2E8F0" },
  risk: { fontSize: 27, fontWeight: "900", marginBottom: 12 },
  finding: { color: "#334155", marginVertical: 6, lineHeight: 20 },
  disclaimer: { color: "#64748B", fontSize: 12, marginTop: 16, lineHeight: 18 },
});
