import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../styles/theme';

const StrategyCard = ({ strategy, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.container}
    >
      <LinearGradient
        colors={[colors.cardBackground, colors.surface]}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🎯</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {strategy.name}
            </Text>
            {strategy.tag && (
              <View style={styles.tagContainer}>
                <LinearGradient
                  colors={[colors.gradientStart, colors.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.tag}
                >
                  <Text style={styles.tagText}>{strategy.tag}</Text>
                </LinearGradient>
              </View>
            )}
          </View>
        </View>

        {strategy.tone && (
          <Text style={styles.tone} numberOfLines={2}>
            {strategy.tone}
          </Text>
        )}

        {strategy.stats && (
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{strategy.stats.totalLeads}</Text>
              <Text style={styles.statLabel}>Leads</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{strategy.stats.leadsWon}</Text>
              <Text style={styles.statLabel}>Won</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{strategy.stats.optOut}</Text>
              <Text style={styles.statLabel}>Opt-out</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{strategy.stats.responseRate}%</Text>
              <Text style={styles.statLabel}>Response</Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tap to test this agent
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  tagContainer: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  tone: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.divider,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
  },
  footer: {
    paddingTop: spacing.sm,
  },
  footerText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});

export default StrategyCard;
