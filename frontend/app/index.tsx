import { View, ActivityIndicator, StyleSheet } from "react-native";
import { colors } from "@/src/theme";

// Landing splash — auth redirect handled in root _layout.
export default function Index() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
