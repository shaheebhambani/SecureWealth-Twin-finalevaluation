
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";

const API_BASE = "http://127.0.0.1:8003";

const SCAM_TYPES = [
  "UPI fraud",
  "Phishing",
  "Fake customer support",
  "Investment scam",
  "Remote access scam",
  "QR code scam",
  "Identity theft",
  "Other",
];

type EvidenceFile = {
  name: string;
  uri: string;
  mimeType?: string | null;
};

export default function ReportCyberFraudScreen() {
  const [scamType, setScamType] = useState("UPI fraud");
  const [transactionId, setTransactionId] = useState("");
  const [amount, setAmount] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [bankOrApp, setBankOrApp] = useState("");
  const [description, setDescription] = useState("");
  const [incidentId, setIncidentId] = useState("");
  const [draft, setDraft] = useState("");
  const [evidence, setEvidence] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingEvidence, setSavingEvidence] = useState(false);

  async function apiRequest(path: string, body?: unknown) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || `Request failed (${response.status})`
      );
    }

    return data;
  }

  async function createIncident() {
    if (description.trim().length < 10) {
      Alert.alert(
        "More details needed",
        "Please describe what happened in at least 10 characters."
      );
      return;
    }

    if (amount.trim() && (!Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
      Alert.alert("Invalid amount", "Enter a valid positive amount.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("/api/reports/incidents", {
        scam_type: scamType,
        transaction_id: transactionId.trim(),
        amount: amount.trim() ? Number(amount) : null,
        incident_time: incidentTime.trim(),
        bank_or_app: bankOrApp.trim(),
        description: description.trim(),
        contact_details: "",
      });

      setIncidentId(data.incident.id);
      setDraft("");

      Alert.alert(
        "Incident saved",
        "Your incident has been saved locally. No official complaint has been submitted."
      );
    } catch (error) {
      Alert.alert(
        "Could not save incident",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateDraft() {
    if (!incidentId) {
      Alert.alert("Save incident first", "Create the incident before generating a complaint.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest("/api/reports/generate-draft", {
        incident_id: incidentId,
      });

      setDraft(data.draft || "");
    } catch (error) {
      Alert.alert(
        "Draft generation failed",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function pickEvidence() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const selected: EvidenceFile[] = result.assets.map((file) => ({
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
      }));

      setEvidence((previous) => [...previous, ...selected]);
    } catch {
      Alert.alert("File selection failed", "Please try selecting the file again.");
    }
  }

  async function saveEvidenceMetadata() {
    if (!incidentId) {
      Alert.alert("Save incident first", "Create an incident before adding evidence.");
      return;
    }

    if (evidence.length === 0) {
      Alert.alert("No evidence selected", "Choose a receipt, screenshot, or PDF first.");
      return;
    }

    setSavingEvidence(true);

    try {
      for (const file of evidence) {
        await apiRequest(
          `/api/reports/incidents/${encodeURIComponent(incidentId)}/evidence`,
          {
            filename: file.name,
            description: `Selected evidence (${file.mimeType || "file type unknown"}). File not uploaded.`,
          }
        );
      }

      Alert.alert(
        "Evidence list saved",
        "The filenames were recorded. The actual files have NOT been uploaded to the backend."
      );
    } catch (error) {
      Alert.alert(
        "Could not save evidence list",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSavingEvidence(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Report Cyber Fraud</Text>
      <Text style={styles.subtitle}>
        Record the incident and prepare a complaint for your review.
      </Text>

      <Text style={styles.label}>Type of suspected fraud</Text>
      <View style={styles.chips}>
        {SCAM_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.chip, scamType === type && styles.selectedChip]}
            onPress={() => setScamType(type)}
          >
            <Text style={[styles.chipText, scamType === type && styles.selectedChipText]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Transaction ID (if available)</Text>
      <TextInput
        style={styles.input}
        value={transactionId}
        onChangeText={setTransactionId}
        placeholder="Enter transaction reference"
      />

      <Text style={styles.label}>Amount lost (₹, if applicable)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="e.g. 2500"
      />

      <Text style={styles.label}>Incident date and time</Text>
      <TextInput
        style={styles.input}
        value={incidentTime}
        onChangeText={setIncidentTime}
        placeholder="e.g. 16 October 2026, 6:30 PM"
      />

      <Text style={styles.label}>Bank or payment app</Text>
      <TextInput
        style={styles.input}
        value={bankOrApp}
        onChangeText={setBankOrApp}
        placeholder="e.g. bank name or UPI app"
      />

      <Text style={styles.label}>What happened?</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the events in your own words..."
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={createIncident}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Save Incident</Text>
      </TouchableOpacity>

      {!!incidentId && (
        <Text style={styles.successText}>
          Incident saved. Reference: {incidentId}
        </Text>
      )}

      <Text style={styles.sectionTitle}>Evidence</Text>
      <Text style={styles.subtitle}>
        Select payment receipts, screenshots, or PDFs.
      </Text>

      <TouchableOpacity style={styles.secondaryButton} onPress={pickEvidence}>
        <Text style={styles.secondaryButtonText}>Choose Evidence Files</Text>
      </TouchableOpacity>

      {evidence.map((file, index) => (
        <View key={`${file.uri}-${index}`} style={styles.fileRow}>
          <Text style={styles.fileName}>{file.name}</Text>
          <TouchableOpacity
            onPress={() =>
              setEvidence((previous) => previous.filter((_, i) => i !== index))
            }
          >
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={saveEvidenceMetadata}
        disabled={savingEvidence}
      >
        <Text style={styles.secondaryButtonText}>
          {savingEvidence ? "Saving..." : "Save Evidence List"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.warningText}>
        Current prototype: only evidence filenames are recorded. The files themselves are not uploaded or securely stored by this feature yet.
      </Text>

      <Text style={styles.sectionTitle}>AI Complaint Draft</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={generateDraft}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Generate with Gemini</Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={[styles.input, styles.draftBox]}
        value={draft}
        onChangeText={setDraft}
        placeholder="Your generated complaint will appear here. Review and edit it before using it."
        multiline
        textAlignVertical="top"
      />

      {!!draft && (
        <Text style={styles.warningText}>
          Review every detail for accuracy. This is a draft, not a submitted complaint.
        </Text>
      )}

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => Linking.openURL("https://cybercrime.gov.in/")}
      >
        <Text style={styles.secondaryButtonText}>Open Official Cybercrime Portal</Text>
      </TouchableOpacity>

      <Text style={styles.helpline}>
        If money has been lost to cyber financial fraud, call 1930 promptly.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 48,
    backgroundColor: "#F7F9FC",
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#152238",
    marginBottom: 8,
  },
  subtitle: {
    color: "#5B667A",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  label: {
    color: "#26364D",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: "#18263A",
  },
  multiline: {
    minHeight: 120,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#D5DDE8",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  selectedChip: {
    backgroundColor: "#173B67",
    borderColor: "#173B67",
  },
  chipText: {
    color: "#34445B",
    fontSize: 12,
  },
  selectedChipText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#173B67",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#173B67",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#173B67",
    fontWeight: "700",
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#152238",
    marginTop: 28,
    marginBottom: 8,
  },
  fileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E6EF",
  },
  fileName: {
    flex: 1,
    color: "#34445B",
  },
  removeText: {
    color: "#B42318",
    fontWeight: "700",
  },
  successText: {
    color: "#18794E",
    marginTop: 12,
    lineHeight: 20,
  },
  warningText: {
    color: "#7B4F08",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  draftBox: {
    minHeight: 240,
    marginTop: 14,
    lineHeight: 22,
  },
  helpline: {
    color: "#173B67",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 22,
    lineHeight: 22,
  },
});
