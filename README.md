# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Project structure

This project uses **Expo** with **React Navigation** and **Expo Router**. Here is how the main pieces fit together:

- **Runtime entry point**
  - **`App.tsx`**: The root React component that Expo loads first. It sets up the native stack navigator (via `@react-navigation/native`) and wires together the main screens from `src/screens`.
  - **`app/_layout.tsx`**: The root layout for the Expo Router file-based routing system. It defines a stack of routes like `Home`, `ScanReceipt`, `SelectItems`, and `Summary`.
  - **`app/(tabs)/_layout.tsx`**: The layout for the bottom tab navigator used within the router (e.g. `index.tsx` and `explore.tsx`).

- **Routing and screens**
  - **`app/`**: Holds route files for **Expo Router**. Each file here represents a screen or layout. For example, `Home.tsx` simply renders the `HomeScreen` component from `src/screens`.
  - **`src/screens/`**: Contains the actual screen implementations (`HomeScreen.tsx`, `ScanReceiptScreen.tsx`, `SelectItemsScreen.tsx`, `SummaryScreen.tsx`). These are the core UI flows of your app.
  - **`src/types/navigation.ts`**: Central place for navigation types (`RootStackParamList`), keeping route params strongly typed and easier to maintain.

- **UI building blocks and styling**
  - **`components/`**: Reusable UI pieces (e.g. `themed-view`, `themed-text`, `parallax-scroll-view`, `ui/icon-symbol`, `haptic-tab`) that are shared across screens.
  - **`constants/theme.ts`**: Theme configuration and color definitions used throughout the app.
  - **`hooks/`**: Custom hooks for things like color scheme and themed colors (`use-color-scheme`, `use-theme-color`).
  - **`assets/`**: Static assets such as icons, logos, and splash images used by the app and configured in `app.json`.

- **Tooling and scripts**
  - **`scripts/reset-project.js`**: Utility script from the Expo template for resetting the project to a clean state.
  - **`tsconfig.json`, `eslint.config.js`, `expo-env.d.ts`**: TypeScript, linting, and environment configuration for a consistent, type-safe developer experience.

In practice, you will:

- Put **screen logic and business logic** in `src/screens` (and any future `src/**` modules).
- Put **navigation route wrappers and layouts** in `app/` (for Expo Router).
- Use `App.tsx` as the **top-level native entry** that mounts your navigation tree.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
