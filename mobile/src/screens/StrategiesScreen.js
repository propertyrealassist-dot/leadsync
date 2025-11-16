import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import StrategyCard from '../components/StrategyCard';
import { colors, spacing, fontSize, fontWeight } from '../styles/theme';

const StrategiesScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [strategies, setStrategies] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    try {
      const [strategiesRes, conversationsRes] = await Promise.all([
        api.templates.getAll(),
        api.conversations.getAll(),
      ]);

      const strategiesData = strategiesRes.data || [];
      const conversationsData = conversationsRes.data || [];

      // Calculate stats for each strategy
      const strategiesWithStats = strategiesData.map(strategy => {
        const agentConversations = conversationsData.filter(c =>
          c.template_id === strategy.id || c.template_name === strategy.name
        );

        const totalLeads = agentConversations.length;
        const activeLeads = agentConversations.filter(c => c.status === 'active').length;
        const leadsWon = agentConversations.filter(c => c.status === 'completed' || c.status === 'booked').length;
        const optOut = agentConversations.filter(c => c.status === 'failed').length;
        const responseRate = totalLeads > 0
          ? Math.round((agentConversations.filter(c => c.status !== 'failed').length / totalLeads) * 100)
          : 0;

        return {
          ...strategy,
          stats: {
            totalLeads,
            activeLeads,
            leadsWon,
            optOut,
            responseRate
          }
        };
      });

      setStrategies(strategiesWithStats);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error loading strategies:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStrategies();
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="rocket-outline" size={64} color={colors.textTertiary} />
      <Text style={styles.emptyTitle}>No AI Agents Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first AI agent to start automating conversations
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => {
          // Navigate to create strategy (would need to be implemented)
          console.log('Create strategy');
        }}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.createGradient}
        >
          <Ionicons name="add" size={24} color={colors.textPrimary} />
          <Text style={styles.createText}>Create AI Agent</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

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
        <Text style={styles.title}>AI Agents</Text>
        <Text style={styles.subtitle}>
          {strategies.length} {strategies.length === 1 ? 'agent' : 'agents'} created
        </Text>
      </LinearGradient>

      <FlatList
        data={strategies}
        renderItem={({ item }) => (
          <StrategyCard
            strategy={item}
            onPress={() => navigation.navigate('TestAI', { strategy: item })}
          />
        )}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.list,
          strategies.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
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
  list: {
    padding: spacing.lg,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  createText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});

export default StrategiesScreen;
