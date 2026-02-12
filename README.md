# 🌍 EduBridge - Education for Everyone, Everywhere

**Bringing quality education to underprivileged areas through offline-first, multi-language learning.**

EduBridge is a mobile-first educational platform designed specifically for learners in low-resource environments. With offline support, multi-language capabilities, and optimized content delivery for low-bandwidth areas, we're bridging the education gap globally.

---

## ✨ Key Features

### 🌐 Multi-Language Support
- **4 languages at launch**: English, Spanish, French, Arabic
- Easy-to-add additional languages via i18n framework
- Content translations at course and lesson level
- RTL support for Arabic and other languages

### 📴 Offline-First Architecture
- Download courses and lessons for offline access
- Local progress tracking with cloud sync when online
- Compressed video delivery (100:1 compression ratio inspired by Kolibri)
- SQLite local database for offline data persistence

### 📱 Mobile & Low-Bandwidth Optimized
- Built with React Native and Expo for iOS, Android, and Web
- Adaptive streaming based on network conditions
- Low-bandwidth mode with text-heavy fallbacks
- Progressive Web App (PWA) capabilities

### 📚 Comprehensive Learning Experience
- Video lessons with transcripts
- Text-based resources and exercises
- Progress tracking and achievements
- Resume where you left off
- Free and accessible content

### 👨‍🏫 Educator Tools
- Simple CMS for course creation
- Multi-language content management
- Video upload with automatic compression
- Analytics and student engagement tracking

---

## 🏗️ Tech Stack

| Layer | Technology | Why? |
|-------|-----------|------|
| **Frontend** | Expo SDK 54 + React Native | Cross-platform mobile (iOS/Android/Web) |
| **Routing** | expo-router v6 | File-based navigation |
| **Backend** | Supabase | PostgreSQL + Auth + Storage + Edge Functions |
| **i18n** | i18next + expo-localization | Multi-language support |
| **Offline** | expo-sqlite + expo-file-system | Local data persistence |
| **Video** | expo-av + expo-video | Offline video playback |
| **State** | React Context + AsyncStorage | Local-first state management |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Expo CLI
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Migos-Inc/edubridge.git
   cd edubridge
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Set up Supabase database**

   In your Supabase dashboard, run the migration file:
   ```
   supabase/migrations/20250212000000_init_schema.sql
   ```

   Or use the Supabase CLI:
   ```bash
   supabase db push
   ```

5. **Run the app**
   ```bash
   bun start
   # or
   npm start
   ```

   Then press:
   - `i` for iOS simulator
   - `a` for Android emulator
   - `w` for web browser

---

## 📂 Project Structure

```
edubridge/
├── app/                    # expo-router screens
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home screen
│   ├── courses/           # Course screens
│   ├── lessons/           # Lesson viewer
│   └── settings/          # Settings screens
├── src/
│   ├── components/        # Reusable UI components
│   ├── services/          # API and data services
│   ├── hooks/             # Custom React hooks
│   ├── contexts/          # React Context providers
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   ├── config/            # App configuration
│   └── i18n/              # Internationalization
│       └── locales/       # Translation files (en, es, fr, ar)
├── supabase/
│   └── migrations/        # Database migrations
└── assets/                # Images, fonts, etc.
```

---

## 🌟 Roadmap

### ✅ Phase 1 - Foundation (Current)
- [x] Multi-language support (EN, ES, FR, AR)
- [x] Basic app structure with expo-router
- [x] Supabase database schema
- [x] Core screens (Home, Courses, Settings)

### 🔄 Phase 2 - Core Features (Next)
- [ ] Offline video download and playback
- [ ] Progress tracking (local + cloud sync)
- [ ] Course enrollment and lesson completion
- [ ] Authentication (anonymous + account-based)
- [ ] Search and filtering

### 🔮 Phase 3 - Advanced Features
- [ ] Low-bandwidth mode with adaptive quality
- [ ] Video compression pipeline
- [ ] Community features (forums, peer learning)
- [ ] Educator CMS and dashboard
- [ ] Push notifications for new content
- [ ] Achievements and gamification

### 🚢 Phase 4 - Scale & Impact
- [ ] Additional languages (Hindi, Portuguese, Swahili, etc.)
- [ ] Content partnerships (Khan Academy, local educators)
- [ ] Offline mesh networking for content sharing
- [ ] Analytics dashboard for educators
- [ ] Mobile app optimization for low-spec devices

---

## 🎯 Design Principles

1. **Offline-First**: Everything should work without internet
2. **Mobile-First**: Designed for phones in low-resource areas
3. **Language-Inclusive**: Multi-language from day one, not an afterthought
4. **Performance-Conscious**: Optimized for low-bandwidth, low-spec devices
5. **Open & Accessible**: Free education for everyone

---

## 🤝 Contributing

We welcome contributions! Whether you're:
- Adding a new language translation
- Creating educational content
- Fixing bugs or adding features
- Improving documentation

**To contribute:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📖 Inspiration

EduBridge is inspired by:
- **[Kolibri](https://learningequality.org/kolibri/)** - Offline education platform (220+ countries, 173 languages)
- **Khan Academy** - Free, world-class education
- The millions of learners in underprivileged areas who deserve access to quality education

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **Learning Equality** for pioneering offline education with Kolibri
- **Supabase** for providing an amazing backend platform
- **Expo** for making cross-platform development accessible
- All educators creating open educational resources

---

## 📞 Contact

Built with ❤️ by [Migos Inc](https://github.com/Migos-Inc)

**Questions or want to help?**
- Open an issue on GitHub
- Email: [your-email]

---

**Together, we're bridging the education gap. One lesson at a time. 🌍📚**
