import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import StrategyCard from '../components/StrategyCard';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../styles/theme';

const TestAIScreen = ({ route, navigation }) => {
  const [strategies, setStrategies] = useState([]);
  const [selectedStrategy, setSelectedStrategy] = useState(route?.params?.strategy || null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  useEffect(() => {
    if (selectedStrategy) {
      startTest();
    }
  }, [selectedStrategy]);

  const loadStrategies = async () => {
    try {
      const response = await api.templates.getAll();
      setStrategies(response.data || []);
    } catch (error) {
      console.error('Error loading strategies:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTest = () => {
    setMessages([
      {
        id: '1',
        type: 'ai',
        text: selectedStrategy.initialMessage ||
          "Hey! Thanks for reaching out. Can you confirm your name?",
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      text: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(inputMessage);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: aiResponse,
          timestamp: new Date(),
        },
      ]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput) => {
    const input = userInput.toLowerCase();

    // Check FAQs
    if (selectedStrategy.faqs && selectedStrategy.faqs.length > 0) {
      for (let faq of selectedStrategy.faqs) {
        if (input.includes(faq.question.toLowerCase().substring(0, 10))) {
          return faq.answer;
        }
      }
    }

    // Default responses
    if (input.includes('yes') || input.includes('yeah')) {
      return "Great! Let me help you with that.";
    }

    if (input.includes('price') || input.includes('cost')) {
      return "Our pricing is customized based on your specific needs. Would you like to schedule a call?";
    }

    // CTA
    if (messages.length > 4 && selectedStrategy.cta) {
      return selectedStrategy.cta;
    }

    return "I understand. Can you tell me more about what you're looking for?";
  };

  const resetChat = () => {
    setMessages([]);
    setSelectedStrategy(null);
    setInputMessage('');
  };

  const renderMessage = ({ item }) => {
    const isAI = item.type === 'ai';
    return (
      <View style={[styles.messageContainer, isAI ? styles.aiMessage : styles.userMessage]}>
        <View style={[styles.messageBubble, isAI ? styles.aiBubble : styles.userBubble]}>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.messageTime}>
            {item.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.aiMessage]}>
      <View style={[styles.messageBubble, styles.aiBubble]}>
        <View style={styles.typingIndicator}>
          <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
          <View style={[styles.typingDot, { animationDelay: '200ms' }]} />
          <View style={[styles.typingDot, { animationDelay: '400ms' }]} />
        </View>
      </View>
    </View>
  );

  if (!selectedStrategy) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <Text style={styles.title}>Test AI Agent</Text>
          <Text style={styles.subtitle}>Select an agent to test</Text>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={strategies}
            renderItem={({ item }) => (
              <StrategyCard strategy={item} onPress={() => setSelectedStrategy(item)} />
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.strategyList}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Chat Header */}
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.chatHeader}
      >
        <TouchableOpacity onPress={resetChat} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.chatHeaderText}>
          <Text style={styles.chatTitle}>{selectedStrategy.name}</Text>
          <Text style={styles.chatSubtitle}>{selectedStrategy.tag}</Text>
        </View>
        <TouchableOpacity onPress={startTest} style={styles.resetButton}>
          <Ionicons name="refresh" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.chatContainer}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListFooterComponent={isTyping ? renderTypingIndicator : null}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textTertiary}
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputMessage.trim()}
            style={[
              styles.sendButton,
              !inputMessage.trim() && styles.sendButtonDisabled,
            ]}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendGradient}
            >
              <Ionicons name="send" size={20} color={colors.textPrimary} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  strategyList: {
    padding: spacing.lg,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
  },
  chatHeaderText: {
    flex: 1,
  },
  chatTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  chatSubtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  resetButton: {
    padding: spacing.sm,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  messageText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  messageTime: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    fontSize: fontSize.md,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TestAIScreen;
