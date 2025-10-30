# LeadSync

**AI-Powered Lead Management & Automation Platform**

LeadSync is a cutting-edge SaaS platform that leverages artificial intelligence to automate lead conversations, qualify prospects, and book appointments automatically. Built with React and Node.js, it integrates seamlessly with GoHighLevel to provide intelligent conversation management.

---

## ✨ Features

- 🤖 **AI Conversation Agents** - Build intelligent AI agents that handle lead conversations automatically
- 📊 **Advanced Analytics** - Track performance metrics, conversion rates, and agent effectiveness
- ✨ **Test AI Interface** - Real-time testing environment to simulate conversations
- 🤖 **Co-Pilot Strategy Builder** - Guided wizard to create sophisticated conversation strategies (coming soon)
- 🔗 **GoHighLevel Integration** - Seamless integration with GHL for workflow automation
- 💬 **Multi-Step Conversations** - FAQs, qualification questions, follow-ups, and custom actions
- 📈 **Performance Tracking** - Monitor leads won, opt-outs, and response rates
- 🎯 **Strategy Management** - Import/export AI strategies, duplicate and customize agents
- 📅 **Appointment Booking** - Automated appointment scheduling with calendar integration

---

## 🎨 Design Highlights

- **Animated Space Theme** - Premium glassmorphism design with flowing gradients
- **100 Twinkling Stars** - Dynamic star field with floating particles
- **Responsive Design** - Mobile-first approach with adaptive layouts
- **Modern UI/UX** - Hover effects, smooth transitions, and professional aesthetics

---

## 🛠️ Tech Stack

### Frontend
- **React 18.2** - Modern React with hooks and functional components
- **React Router DOM 6.20** - Client-side routing
- **Axios** - HTTP client for API requests
- **CSS3** - Custom animations and glassmorphism effects

### Backend
- **Node.js** - JavaScript runtime
- **Express 4.18** - Web application framework
- **Better-SQLite3** - Embedded SQL database
- **JWT** - Authentication and authorization
- **Anthropic AI SDK** - Claude AI integration for conversation intelligence

### AI Integration
- **Claude 3** - Anthropic's language model for intelligent conversations
- **GoHighLevel API** - CRM and workflow automation

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- GoHighLevel account (for integrations)
- Anthropic API key (for AI features)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/leadsync.git
cd leadsync
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:3001
```

Start frontend development server:
```bash
npm start
```
Frontend will run on http://localhost:3000

#### 3. Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=3001
DATABASE_PATH=./data/leadsync.db
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=30d
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Initialize database:
```bash
npm run init-db
```

Start backend server:
```bash
npm start
```
Backend will run on http://localhost:3001

---

## 📁 Project Structure

```
leadsync/
├── frontend/                 # React frontend application
│   ├── public/              # Static files
│   │   ├── logo.png        # LeadSync logo
│   │   ├── index.html      # HTML template
│   │   └── manifest.json   # PWA manifest
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Home.js           # Landing page
│   │   │   ├── AIAgents.js       # Strategy management
│   │   │   ├── StrategyEditor.js # Agent creation/editing
│   │   │   ├── Analytics.js      # Performance tracking
│   │   │   ├── CoPilot.js        # Strategy builder (coming soon)
│   │   │   ├── ConversationTest.js # AI testing interface
│   │   │   └── ...
│   │   ├── context/        # React context providers
│   │   │   ├── AuthContext.js    # Authentication state
│   │   │   └── NavigationContext.js # Navigation management
│   │   ├── App.js          # Main app component
│   │   ├── App.css         # Global styles
│   │   └── index.css       # Animated background styles
│   └── package.json
│
├── backend/                 # Node.js backend API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   │   ├── auth.js           # Authentication routes
│   │   │   ├── templates.js      # AI agent CRUD
│   │   │   ├── conversations.js  # Conversation management
│   │   │   └── ...
│   │   ├── middleware/     # Express middleware
│   │   │   └── auth.js           # JWT authentication
│   │   ├── database/       # Database setup
│   │   │   └── init.js           # Schema initialization
│   │   └── server.js       # Express app entry point
│   ├── data/               # SQLite database storage
│   └── package.json
│
└── README.md               # This file
```

---

## 📖 Usage Guide

### Creating Your First AI Agent

1. **Navigate to Strategies**
   - Click "Strategies" in the sidebar
   - Click "Create New Agent"

2. **Configure Agent Settings** (5-Step Process)
   - **Step 1:** Basic Info (name, tag, tone, company info)
   - **Step 2:** FAQs (common questions and answers)
   - **Step 3:** Qualification Questions (collect lead information)
   - **Step 4:** Follow-ups (automated follow-up messages)
   - **Step 5:** Custom Actions (triggers and chains)

3. **Test Your Agent**
   - Go to "Test AI" page
   - Select your agent
   - Start a conversation to see how it performs

4. **Deploy & Monitor**
   - Integrate with GoHighLevel
   - Monitor performance in Analytics
   - Optimize based on conversion metrics

### Testing Conversations

- Navigate to "Test AI" page
- Select an AI agent from dropdown
- Type messages as a lead would
- Watch the AI respond in real-time
- Review conversation flow and optimize

### Viewing Analytics

- Navigate to "Analytics" page
- View overview stats (total conversations, active leads, appointments, conversion rate)
- Filter by status (All, Active, Appointments, Completed)
- Click "View" on any conversation to see detailed history

---

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user profile

### AI Agents (Templates)
- `GET /api/templates` - List all AI agents
- `GET /api/templates/:id` - Get specific agent with nested data
- `POST /api/templates` - Create new AI agent
- `PUT /api/templates/:id` - Update AI agent
- `DELETE /api/templates/:id` - Delete AI agent

### Conversations
- `GET /api/conversations` - List all conversations
- `GET /api/conversations/:id` - Get conversation details
- `POST /api/conversations` - Create new conversation
- `POST /api/conversations/:id/messages` - Add message to conversation

---

## 🎯 Environment Variables

### Frontend (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:3001` |

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3001) |
| `DATABASE_PATH` | SQLite database path | No (default: ./data/leadsync.db) |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `JWT_EXPIRES_IN` | Token expiration time | No (default: 30d) |
| `ANTHROPIC_API_KEY` | Claude AI API key | Yes |
| `GHL_API_KEY` | GoHighLevel API key | Optional |

---

## 🚢 Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `cd frontend && npm run build`
3. Set output directory: `frontend/build`
4. Add environment variable: `REACT_APP_API_URL=https://your-backend-url.com`
5. Deploy

### Backend (Render)
1. Create new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add environment variables (see Backend .env section)
6. Deploy

---

## 🧪 Testing

### Manual Testing
1. Start both frontend and backend servers
2. Register a new user account
3. Create an AI agent with sample data
4. Test conversation flow in "Test AI" page
5. Verify analytics data updates correctly

### Testing Checklist
- [ ] User registration and login works
- [ ] JWT tokens persist for 30 days
- [ ] AI agents can be created, edited, duplicated, deleted
- [ ] All 5 steps save data correctly
- [ ] Export includes all fields
- [ ] Import handles validation
- [ ] Test AI interface works
- [ ] Analytics shows correct metrics
- [ ] Modals replace all browser alerts
- [ ] Logo displays and is clickable
- [ ] Animated background renders
- [ ] Responsive on mobile devices

---

## 🐛 Known Issues

- Co-Pilot feature is coming soon (placeholder page implemented)
- Settings page has minimal functionality

---

## 🤝 Contributing

This is a proprietary project. For internal development:

1. Create feature branch: `git checkout -b feature/your-feature-name`
2. Make changes and test thoroughly
3. Commit with descriptive message: `git commit -m "Add: your feature description"`
4. Push to branch: `git push origin feature/your-feature-name`
5. Create Pull Request for review

---

## 📄 License

**Proprietary - All Rights Reserved**

Copyright © 2024 LeadSync. This software and associated documentation files are proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---

## 📞 Support

For support, feature requests, or bug reports:
- Email: support@leadsync.com
- Documentation: https://docs.leadsync.com

---

## 🎉 Acknowledgments

- Anthropic Claude AI for conversation intelligence
- GoHighLevel for CRM integration
- React team for the excellent framework
- Open source community for invaluable tools

---

**Built with ❤️ for efficient lead management**
