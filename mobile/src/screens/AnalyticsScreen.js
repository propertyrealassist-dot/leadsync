import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../api/client';
import StatCard from '../components/StatCard';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../styles/theme';

const AnalyticsScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalLeads: 0,
    conversionRate: 0,
    avgResponseTime: 0,
    appointmentsBooked: 0,
    revenue: 0,
    activeAgents: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [conversationsRes, templatesRes] = await Promise.all([
        api.conversations.getAll(),
        api.templates.getAll(),
      ]);

      const conversations = conversationsRes.data || [];
      const templates = templatesRes.data || [];

      const totalLeads = conversations.length;
      const booked = conversations.filter((c) => c.status === 'booked').length;
      const conversionRate = totalLeads > 0 ? ((booked / totalLeads) * 100).toFixed(1) : 0;

      setAnalytics({
        totalLeads,
        conversionRate: parseFloat(conversionRate),
        avgResponseTime: 2.4,
        appointmentsBooked: booked,
        revenue: booked * 150,
        activeAgents: templates.length,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Performance insights & metrics</Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <StatCard
              icon="📊"
              label="Total Leads"
              value={analytics.totalLeads}
              gradient={[colors.primary, colors.secondary]}
            />
            <View style={styles.spacer} />
            <StatCard
              icon="🎯"
              label="Conversion Rate"
              value={`${analytics.conversionRate}%`}
              gradient={['#8B5CF6', '#EC4899']}
            />
            <View style={styles.spacer} />
            <StatCard
              icon="⚡"
              label="Avg Response"
              value={`${analytics.avgResponseTime}min`}
              gradient={['#3B82F6', '#8B5CF6']}
            />
          </View>
        </View>

        {/* Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.metricsGrid}>
            <StatCard
              icon="📅"
              label="Appointments"
              value={analytics.appointmentsBooked}
              gradient={['#10B981', '#3B82F6']}
            />
            <View style={styles.spacer} />
            <StatCard
              icon="💰"
              label="Revenue"
              value={`$${analytics.revenue.toLocaleString()}`}
              gradient={['#F59E0B', '#EF4444']}
            />
            <View style={styles.spacer} />
            <StatCard
              icon="🤖"
              label="Active Agents"
              value={analytics.activeAgents}
              gradient={['#8B5CF6', '#3B82F6']}
            />
          </View>
        </View>

        {/* Insights Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          <View style={styles.insightCard}>
            <LinearGradient
              colors={[colors.cardBackground, colors.surface]}
              style={styles.insightGradient}
            >
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>💡</Text>
                <Text style={styles.insightTitle}>Optimization Opportunity</Text>
              </View>
              <Text style={styles.insightText}>
                Your conversion rate is strong at {analytics.conversionRate}%. Consider
                testing more AI agents to increase lead volume.
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.insightCard}>
            <LinearGradient
              colors={[colors.cardBackground, colors.surface]}
              style={styles.insightGradient}
            >
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>📈</Text>
                <Text style={styles.insightTitle}>Growth Trend</Text>
              </View>
              <Text style={styles.insightText}>
                You've booked {analytics.appointmentsBooked} appointments. Keep up the
                momentum by engaging with leads promptly.
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Charts Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trends</Text>
          <View style={styles.chartPlaceholder}>
            <LinearGradient
              colors={[colors.cardBackground, colors.surface]}
              style={styles.chartGradient}
            >
              <Text style={styles.chartText}>📊</Text>
              <Text style={styles.chartLabel}>Detailed charts coming soon</Text>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    gap: spacing.md,
  },
  spacer: {
    height: spacing.md,
  },
  insightCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightGradient: {
    padding: spacing.md,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  insightIcon: {
    fontSize: 24,
  },
  insightTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  insightText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  chartPlaceholder: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartGradient: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartText: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  chartLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});

export default AnalyticsScreen;
