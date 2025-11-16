import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import StatCard from '../components/StatCard';
import StrategyCard from '../components/StrategyCard';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../styles/theme';

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalAgents: 0,
    totalConversations: 0,
    activeLeads: 0,
    appointmentsBooked: 0,
  });
  const [recentStrategies, setRecentStrategies] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [strategiesRes, conversationsRes] = await Promise.all([
        api.templates.getAll(),
        api.conversations.getAll(),
      ]);

      const strategies = strategiesRes.data || [];
      const conversations = conversationsRes.data || [];

      setStats({
        totalAgents: strategies.length,
        totalConversations: conversations.length,
        activeLeads: conversations.filter((c) => c.status === 'active').length,
        appointmentsBooked: conversations.filter((c) => c.status === 'booked')
          .length,
      });

      setRecentStrategies(strategies.slice(0, 3));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
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
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Hero Header */}
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.heroHeader}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>
            <Text style={styles.userName}>{user?.firstName || user?.name || 'User'}</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            AI-Powered Lead Management & Automation
          </Text>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroPrimaryButton}
              onPress={() => navigation.navigate('Strategies')}
            >
              <Ionicons name="add-circle" size={20} color={colors.textPrimary} />
              <Text style={styles.heroPrimaryText}>Create AI Agent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroSecondaryButton}
              onPress={() => navigation.navigate('TestAI')}
            >
              <Ionicons name="flask-outline" size={20} color={colors.textPrimary} />
              <Text style={styles.heroSecondaryText}>Test AI</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View key="stat-row-1" style={styles.statRow}>
              <View key="stat-agents" style={styles.statHalf}>
                <StatCard
                  icon="🤖"
                  label="AI Agents"
                  value={stats.totalAgents}
                  gradient={[colors.primary, colors.secondary]}
                />
              </View>
              <View key="stat-conversations" style={styles.statHalf}>
                <StatCard
                  icon="💬"
                  label="Conversations"
                  value={stats.totalConversations}
                  gradient={['#3B82F6', '#8B5CF6']}
                />
              </View>
            </View>
            <View key="stat-row-2" style={styles.statRow}>
              <View key="stat-leads" style={styles.statHalf}>
                <StatCard
                  icon="🎯"
                  label="Active Leads"
                  value={stats.activeLeads}
                  gradient={['#10B981', '#3B82F6']}
                />
              </View>
              <View key="stat-appointments" style={styles.statHalf}>
                <StatCard
                  icon="📅"
                  label="Appointments"
                  value={stats.appointmentsBooked}
                  gradient={['#F59E0B', '#EF4444']}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              key="action-strategies"
              style={styles.actionCard}
              onPress={() => navigation.navigate('Strategies')}
            >
              <LinearGradient
                colors={[colors.cardBackground, colors.surface]}
                style={styles.actionGradient}
              >
                <Ionicons name="create-outline" size={32} color={colors.primary} />
                <Text style={styles.actionText}>Create Strategy</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              key="action-test"
              style={styles.actionCard}
              onPress={() => navigation.navigate('TestAI')}
            >
              <LinearGradient
                colors={[colors.cardBackground, colors.surface]}
                style={styles.actionGradient}
              >
                <Ionicons name="chatbubbles-outline" size={32} color={colors.secondary} />
                <Text style={styles.actionText}>Test AI</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              key="action-analytics"
              style={styles.actionCard}
              onPress={() => navigation.navigate('Analytics')}
            >
              <LinearGradient
                colors={[colors.cardBackground, colors.surface]}
                style={styles.actionGradient}
              >
                <Ionicons name="bar-chart-outline" size={32} color={colors.info} />
                <Text style={styles.actionText}>View Analytics</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Strategies */}
        {recentStrategies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent AI Agents</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Strategies')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentStrategies.map((strategy) => (
              <StrategyCard
                key={strategy._id}
                strategy={strategy}
                onPress={() => navigation.navigate('TestAI', { strategy })}
              />
            ))}
          </View>
        )}
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    opacity: 0.9,
  },
  logoutButton: {
    padding: spacing.sm,
  },
  heroTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
    opacity: 0.9,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroPrimaryText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  heroSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  heroSecondaryText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  section: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  viewAll: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  statsGrid: {
    gap: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statHalf: {
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionGradient: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
});

export default HomeScreen;
