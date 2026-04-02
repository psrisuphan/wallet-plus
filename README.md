<p align="center">
  <img src="screenshots/app-icon.png" alt="Wallet+ Logo" width="180" />
</p>

<h1 align="center">Wallet+</h1>

<p align="center">
  <strong>A modern, feature-rich personal finance tracker built with React Native & Firebase</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Native-0.83-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Expo-55-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-iOS%20%7C%20Android-green?style=flat-square" />
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/License-Private-red?style=flat-square" />
</p>

---

## 📱 Screenshots

<p align="center">
  <img src="screenshots/dashboard.png" alt="Dashboard" width="200" />
  &nbsp;&nbsp;
  <img src="screenshots/add_transaction.png" alt="Add Transaction" width="200" />
  &nbsp;&nbsp;
  <img src="screenshots/wallets.png" alt="Wallets" width="200" />
  &nbsp;&nbsp;
  <img src="screenshots/summary.png" alt="Summary" width="200" />
</p>

<p align="center">
  <em>Dashboard • Add Transaction • Wallets • Summary</em>
</p>

---

## ✨ Features

### 💰 Multi-Wallet Management
- Create and manage multiple wallets (Cash, Bank, Savings, etc.)
- Customize each wallet with unique icons, colors, and descriptions
- Real-time balance tracking across all wallets
- Quick wallet selection with search and sorting when adding transactions

### 📊 Transaction Tracking
- Log income and expenses with ease
- **10 expense categories**: Food, Transport, Shopping, Bills, Health, Education, Groceries, Housing, Utilities, Entertainment
- **6 income categories**: Salary, Business, Investment, Bonus, Freelance, Other
- Attach **image notes** (receipts, bills) to any transaction
- Add optional text notes for detailed record-keeping
- **Insufficient balance warning** when expenses exceed wallet balance

### 📋 Transaction Detail Modal
- View comprehensive transaction details in a sleek popup modal
- Full-width image previews for attached receipts
- Quickly navigate to edit mode from the detail view
- Consistent experience across Dashboard and Transactions list

### 📈 Financial Summary & Analytics
- **Period-based filtering**: Today, Weekly, Monthly, Yearly
- Income vs. Expense overview with visual indicators
- **Category breakdown** with percentage bars and color-coded visualizations
- **Monthly comparison view** for long-term trend analysis
- Aggregated totals for each spending category

### 🏠 Smart Dashboard
- Personalized greeting with profile picture
- **Total balance** card with today's net change indicator
- Scrollable wallet overview cards
- **Today's Activity** feed with the latest transactions
- Quick navigation shortcut (**TXs** button) to full transaction history

### ⚙️ User Settings
- Profile management (display name, profile picture)
- Camera and gallery support for profile photos
- Account information display (email, member since date)
- **Clear all data** option with confirmation safeguard
- Secure sign-out

### 🔐 Authentication
- Email & password authentication via Firebase Auth
- User registration with display name setup
- Forgot password functionality
- Persistent login sessions using AsyncStorage

### 🛡️ Smart UX Safeguards
- **Edit protection**: "Update" button grays out when no changes are detected
- **Empty state guidance**: Proactive notice when adding transactions without wallets, with a direct link to create one
- **Expense warnings**: Alert when spending exceeds wallet balance
- **Confirmation dialogs**: For destructive actions like data clearing

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [React Native](https://reactnative.dev/) 0.83 with [Expo](https://expo.dev/) 55 |
| **Language** | [TypeScript](https://www.typescriptlang.org/) 5.9 |
| **Navigation** | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing) |
| **Backend** | [Firebase](https://firebase.google.com/) (Firestore + Auth) |
| **State** | React Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) |
| **Icons** | [@expo/vector-icons](https://icons.expo.fyi/) (Ionicons) |
| **Image Picker** | [expo-image-picker](https://docs.expo.dev/versions/latest/sdk/imagepicker/) |
| **Persistence** | [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) |

---

## 📁 Project Structure

```
wallet-plus/
├── app/
│   ├── (auth)/                     # Authentication screens
│   │   ├── _layout.tsx
│   │   ├── login_screen.tsx        # Login page
│   │   ├── register_screen.tsx     # Registration page
│   │   └── forgot_password_screen.tsx
│   ├── (tabs)/                     # Main app (tab navigation)
│   │   ├── _layout.tsx             # Tab bar configuration
│   │   ├── index.tsx               # 🏠 Dashboard / Overview
│   │   ├── wallet/
│   │   │   ├── index.tsx           # 💳 Wallet list
│   │   │   └── add.tsx             # ➕ Add new wallet
│   │   ├── transactions/
│   │   │   ├── new.tsx             # ➕ Add transaction
│   │   │   ├── index.tsx           # 📋 All transactions list
│   │   │   └── [id].tsx            # ✏️ Edit transaction
│   │   ├── summary/
│   │   │   └── index.tsx           # 📈 Analytics & Summary
│   │   └── settings/
│   │       └── index.tsx           # ⚙️ User settings
│   └── _layout.tsx                 # Root layout (auth guard)
├── components/
│   ├── Header.tsx                  # Reusable header with navigation
│   └── TransactionDetailModal.tsx  # Transaction detail popup
├── constants/
│   ├── Colors.ts                   # Centralized color tokens
│   └── Categories.ts              # Expense & income category definitions
├── types/
│   └── index.ts                   # Shared TypeScript interfaces
├── assets/                        # App icons and splash screen
├── firebaseConfig.ts              # Firebase initialization
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/) (v9 or later)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo Go](https://expo.dev/go) app on your device (iOS / Android)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/psrisuphan/wallet-plus.git
   cd wallet-plus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**

   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/) and update `firebaseConfig.ts` with your project credentials:
   ```typescript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

4. **Set up Firestore collections**

   The app uses the following Firestore collections:
   - `users` — User profiles (displayName, email, profilePictureBase64)
   - `wallets` — Wallet data (name, balance, icon, color, detail, userId)
   - `transactions` — Transaction records (amount, type, category, walletId, note, imageBase64, date, userId)

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Run on your device**
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Or press `i` for iOS Simulator / `a` for Android Emulator

---

## 🎨 Design System

The app uses a centralized design system defined in `constants/Colors.ts`:

| Token | Color | Usage |
|---|---|---|
| `PRIMARY` | `#699E8A` | Brand green — headers, buttons, accents |
| `INCOME_COLOR` | `#699E8A` | Income indicators |
| `EXPENSE_COLOR` | `#FF3B30` | Expense indicators & warnings |
| `BACKGROUND` | `#F8F9FA` | Page backgrounds |
| `CARD_BG` | `#FFFFFF` | Card surfaces |
| `TEXT_PRIMARY` | `#1a1a1a` | Main text |
| `TEXT_SECONDARY` | `#666` | Subtext |
| `BORDER` | `#F0F0F0` | Card borders & dividers |

---

## 🗺️ Roadmap

- [x] Multi-wallet management
- [x] Transaction tracking with categories
- [x] Image note attachments for receipts
- [x] Financial summary with period filtering
- [x] Monthly comparison analytics
- [x] Transaction detail modal
- [x] Edit change detection (dirty state)
- [x] Empty wallet state onboarding
- [ ] Dark mode support
- [ ] Shared wallets (collaborative expense tracking)
- [ ] Budget goals & alerts
- [ ] Export transactions (CSV / PDF)
- [ ] Push notifications for spending limits
- [ ] Multi-currency support

---

## 🤝 Contributing

This is currently a private project. If you'd like to contribute, please open an issue first to discuss your proposed changes.

---

## 📄 License

This project is private and not open-sourced. All rights reserved.

---

<p align="center">
  Made with ❤️ using React Native & Firebase
</p>
