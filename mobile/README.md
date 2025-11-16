# LeadSync Mobile App 📱

React Native mobile application for LeadSync AI-powered lead management platform.

## ✨ Features

### 🔐 Authentication
- Login & Register screens
- JWT token authentication
- AsyncStorage for token persistence
- Automatic session management

### 🏠 Home Dashboard
- Overview statistics (AI Agents, Conversations, Active Leads, Appointments)
- Quick action buttons
- Recent AI agents list
- Pull-to-refresh

### 🤖 AI Agents (Strategies)
- View all AI conversation strategies
- Beautiful card-based UI
- Pull-to-refresh
- Tap to test agent

### 💬 Test AI
- Interactive chat interface
- Test AI agents in real-time
- Simulated responses based on strategy config
- Typing indicator
- Message timestamps
- Reset chat functionality

### 📊 Analytics
- Key metrics dashboard
- Performance insights
- AI-powered recommendations
- Revenue tracking
- Conversion rate analytics

## 🎨 Design

- **Theme**: Dark mode with purple (#8B5CF6) and pink (#EC4899) gradients
- **Typography**: Clean, modern, accessible
- **Components**: Reusable gradient buttons, stat cards, strategy cards
- **Navigation**: Bottom tab navigation with icons
- **Animations**: Smooth transitions and loading states

## 🏗️ Project Structure

```
mobile/
├── src/
│   ├── api/
│   │   └── client.js              # Axios instance with interceptors
│   ├── components/
│   │   ├── GradientButton.js      # Reusable gradient button
│   │   ├── StatCard.js            # Dashboard stat card
│   │   └── StrategyCard.js        # AI agent card
│   ├── context/
│   │   └── AuthContext.js         # Authentication state management
│   ├── navigation/
│   │   └── AppNavigator.js        # Stack + Tab navigation
│   ├── screens/
│   │   ├── LoginScreen.js         # Login form
│   │   ├── RegisterScreen.js      # Registration form
│   │   ├── HomeScreen.js          # Dashboard
│   │   ├── StrategiesScreen.js    # AI agents list
│   │   ├── TestAIScreen.js        # Chat testing interface
│   │   └── AnalyticsScreen.js     # Analytics & metrics
│   └── styles/
│       └── theme.js               # Design system (colors, spacing, etc.)
├── App.js                          # Main entry point
├── app.json                        # Expo configuration
└── package.json                    # Dependencies

```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac only) or Android Emulator or Expo Go app on physical device
- LeadSync backend running on port 3001

### Installation

1. **Navigate to mobile folder:**
   ```bash
   cd mobile
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   # or
   npx expo start
   ```

4. **Run on your platform:**
   - **iOS Simulator (Mac only):** Press `i`
   - **Android Emulator:** Press `a`
   - **Physical Device:** Scan QR code with Expo Go app

## 🔧 Configuration

### API URL Configuration

The mobile app connects to your backend API. The default URL is set to `http://localhost:3001`.

**For different platforms:**

1. **iOS Simulator:**
   - `http://localhost:3001` ✅ (works directly)

2. **Android Emulator:**
   - Change API_URL to `http://10.0.2.2:3001`
   - Edit `mobile/src/api/client.js` line 10

3. **Physical Device:**
   - Find your computer's local IP address
   - Change API_URL to `http://YOUR_LOCAL_IP:3001`
   - Example: `http://192.168.1.100:3001`
   - Make sure device is on the same WiFi network

### To change API URL:

Edit `mobile/src/api/client.js`:
```javascript
const API_URL = 'http://localhost:3001'; // Change this line
```

## 📦 Dependencies

### Core
- `expo` - Expo framework
- `react` - React library
- `react-native` - React Native framework

### Navigation
- `@react-navigation/native` - Navigation library
- `@react-navigation/stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator
- `react-native-screens` - Native screen support
- `react-native-safe-area-context` - Safe area handling
- `react-native-gesture-handler` - Gesture support
- `react-native-reanimated` - Animation library

### API & Storage
- `axios` - HTTP client
- `@react-native-async-storage/async-storage` - Local storage

### UI
- `expo-linear-gradient` - Gradient components
- `@expo/vector-icons` - Icon library

## 🧪 Testing

### Test Accounts

Create a new account or use existing web app credentials:
- Email: `your-email@example.com`
- Password: Your password

### Testing Flow

1. **Registration:**
   - Tap "Sign up" on login screen
   - Fill in name, email, password
   - Creates account and auto-logs in

2. **Dashboard:**
   - View stats overview
   - Tap quick action buttons
   - Browse recent AI agents

3. **AI Agents:**
   - View all strategies
   - Pull down to refresh
   - Tap agent to test

4. **Test AI:**
   - Chat with AI agent
   - Test responses
   - Reset to start over

5. **Analytics:**
   - View performance metrics
   - See AI insights
   - Track revenue and conversions

## 🎯 Features Roadmap

### Current Features ✅
- ✅ Authentication (Login/Register)
- ✅ Home Dashboard with stats
- ✅ AI Agents list view
- ✅ Test AI chat interface
- ✅ Analytics dashboard
- ✅ Bottom tab navigation
- ✅ Pull-to-refresh
- ✅ Dark theme UI

### Future Enhancements 🚀
- [ ] Create/Edit AI agents from mobile
- [ ] Push notifications for new leads
- [ ] Voice input for chat testing
- [ ] Advanced charts and graphs
- [ ] Export analytics reports
- [ ] Team collaboration features
- [ ] Offline mode support
- [ ] Calendar integration

## 🐛 Troubleshooting

### "Network Error" or "Cannot connect to server"

1. Make sure backend is running: `cd backend && npm start`
2. Check API URL configuration (see Configuration section above)
3. For Android emulator, use `http://10.0.2.2:3001`
4. For physical device, use your computer's local IP

### "Cannot find module" errors

```bash
cd mobile
rm -rf node_modules
npm install
```

### "Metro bundler" issues

```bash
npm start -- --clear
```

### iOS build issues

```bash
cd ios
pod install
cd ..
npm run ios
```

## 📱 Building for Production

### iOS (Mac only)

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

Note: Requires Expo Application Services (EAS) account.

## 🤝 Contributing

This mobile app is part of the LeadSync project. See main project README for contribution guidelines.

## 📄 License

Same as parent LeadSync project.

## 💬 Support

For issues or questions:
1. Check backend is running on port 3001
2. Verify API URL configuration
3. Check console logs for errors
4. Ensure all dependencies are installed

---

**Built with ❤️ using React Native & Expo**

🎨 Design matches web app theme
📱 Native iOS & Android support
⚡ Fast, responsive, beautiful
