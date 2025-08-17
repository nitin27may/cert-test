# 🚀 Azure Certification Practice Exams

A production-ready, real-time practice exam platform for Azure certifications powered by **Supabase** (database, auth, realtime) and **Next.js 14**. Features comprehensive exam management, real-time synchronization, advanced analytics, and enterprise-grade security.

## ✨ Key Features

- **🎯 Real-time Exam Sessions** - Live synchronization across devices with auto-save
- **📊 Advanced Analytics** - Detailed performance insights, topic analysis, and progress tracking
- **🔄 Session Management** - Resume interrupted exams, multi-device support
- **🔒 Enterprise Security** - Row Level Security (RLS), audit logging, rate limiting
- **📱 Responsive Design** - Modern UI with dark mode support
- **⚡ Performance Optimized** - Batched updates, connection monitoring, optimistic UI

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js 14   │    │    Supabase     │    │   Real-time     │
│   Frontend     │◄──►│    Database     │◄──►│  Sync Engine    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  React Hooks   │    │   PostgreSQL    │    │  WebSockets     │
│  & Components  │    │   + RLS + Auth  │    │  + Presence     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Git

### 2. Clone & Install
```bash
git clone <your-repo-url>
cd cert-test
npm install
```

### 3. Environment Setup
Create `.env.local` in the project root:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Database Setup
```bash
# Run database schema and migration
npm run setup:db
npm run migrate:exam-data
```

### 5. Start Development
```bash
npm run dev
# Open http://localhost:3000
```

## 📚 Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run setup:db         # Setup database schema
npm run migrate:exam-data # Migrate JSON data to Supabase
```

## 🗄️ Database Schema

The system uses a comprehensive relational database with the following core tables:

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `exams` | Exam metadata | Title, description, question count |
| `topics` | Exam domains | Weightage, modules, relationships |
| `questions` | Question bank | Types, difficulty, explanations |
| `user_exam_sessions` | User sessions | Progress, status, timing |
| `user_answers` | User responses | Correctness, timing, flags |
| `exam_results` | Performance data | Scores, analytics, insights |
| `certification_info` | Cert details | Requirements, resources, career paths |

## 🔧 Core Services

### Supabase Service Layer
- **CRUD Operations** for all entities
- **Data Transformation** and validation
- **Relationship Management** with automatic joins
- **Batch Operations** for performance

### Real-time Service
- **Postgres Changes** for live updates
- **Broadcast Channels** for cross-client communication
- **Presence Tracking** for user activity
- **Auto-sync Manager** for optimized updates

### Session Management
- **Automatic Session Creation** and resumption
- **Real-time Progress Tracking** across devices
- **Pause/Resume Functionality** with state persistence
- **Connection Monitoring** and offline handling

## 🎯 Available Exams

- **AZ-104** - Azure Administrator Associate (200+ questions, 60% networking focus)
- **AZ-305** - Azure Solutions Architect Expert (150+ questions, 50% networking focus)
- **AI-900** - Azure AI Fundamentals (100+ questions, AI/ML focus)

## 📱 User Experience

### Landing Page
- Modern, responsive design with dark mode
- Feature highlights and exam overviews
- Quick access to practice exams

### Dashboard
- Real-time session management
- Performance analytics and insights
- Recent results and achievements
- Quick actions for exam management

### Exam Interface
- Clean, distraction-free question display
- Real-time answer submission
- Progress tracking and navigation
- Pause/resume functionality

## 🔒 Security Features

- **Row Level Security (RLS)** - Users can only access their own data
- **Authentication** - Supabase Auth with JWT tokens
- **Rate Limiting** - Prevents abuse and ensures performance
- **Audit Logging** - Comprehensive activity tracking
- **Data Validation** - Input sanitization and type checking

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Environment Variables
Ensure all Supabase environment variables are set in your deployment platform.

### Database Backups
Regular database backups are recommended. See `MIGRATION.md` for backup procedures.

## 🛠️ Development

### Project Structure
```
src/
├── app/                 # Next.js 14 app router
│   ├── api/            # API endpoints
│   ├── dashboard/      # User dashboard
│   ├── exam/           # Exam interface
│   └── auth/           # Authentication pages
├── components/          # Reusable UI components
├── contexts/            # React contexts (Auth, Theme)
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and services
│   ├── services/        # Supabase and real-time services
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions
└── store/               # Redux store (legacy support)
```

### Key Components
- **`useOptimizedExamSession`** - Main exam session hook
- **`useExamResults`** - Results and analytics hook
- **`useExamData`** - Exam data management hook
- **`ThemeContext`** - Dark/light mode management
- **`AuthContext`** - Authentication state management

## 🔍 Troubleshooting

### Common Issues
1. **Migration Fails** → Check environment variables and service role key
2. **Real-time Not Working** → Verify RLS policies and real-time settings
3. **Authentication Errors** → Check Supabase keys and auth configuration
4. **Performance Issues** → Monitor database queries and real-time subscriptions

### Debug Mode
```bash
DEBUG=true npm run migrate:exam-data
```

## 📖 Documentation

- **[MIGRATION.md](./MIGRATION.md)** - Database setup and migration guide
- **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** - Complete system setup instructions
- **[ENV-SETUP.md](./ENV-SETUP.md)** - Environment configuration guide
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment instructions
- **[work-in-progress.md](./work-in-progress.md)** - Development progress and features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Ensure all tests pass
- Update documentation for new features
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the markdown files in the project
- **Issues**: Create an issue in the GitHub repository
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🎉 Acknowledgments

- **Supabase** for the excellent backend-as-a-service platform
- **Next.js** team for the amazing React framework
- **Tailwind CSS** for the utility-first CSS framework
- **Azure** for the certification content and structure

---

**Ready to ace your Azure certifications?** 🚀 Start practicing with real exam questions and track your progress in real-time!



