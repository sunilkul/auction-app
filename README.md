# EPL Cricket Auction App

EPL Cricket Auction App is a React-based auction management app for tracking teams, players, bidding flow, and the spin wheel selector for cricket auctions.

## Prerequisites

Before running this project locally, make sure you have the following installed on your machine:

- Node.js 18 or newer
- npm 9 or newer
- Git
- A Firebase project with Realtime Database enabled
- A modern browser such as Chrome, Edge, or Firefox

> If you do not have Node.js installed, download it from https://nodejs.org/ and install the LTS version.

## Clone the project

```bash
git clone <your-repository-url>
cd auciton-app
```

## Install dependencies

Run the following command in the project root:

```bash
npm install
```

This installs all required dependencies for React, TypeScript, webpack, and Firebase.

## Firebase configuration required

This app is configured to connect to Firebase from the file `src/firebase.ts`.

Open `src/firebase.ts` and replace the placeholder values with your own Firebase project's configuration:

```ts
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  databaseURL: 'YOUR_DATABASE_URL',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

To get these values:

1. Go to the Firebase Console.
2. Create or select a project.
3. Open Project Settings.
4. Under "Your apps", add a web app if needed.
5. Copy the Firebase config values and paste them into `src/firebase.ts`.
6. Make sure Firebase Realtime Database is enabled for the project.

> The app will not work correctly until the Firebase config is valid.

## Run the app locally

Start the development server:

```bash
npm start
```

This runs the app using webpack dev server and should automatically open the project in your default browser.

The dev server is configured to run on port 3000.

If it does not open automatically, visit:

```text
http://localhost:3000
```

## Build for production

To create a production build:

```bash
npm run build
```

This generates the optimized files in the build output directory used by webpack.

## Project structure overview

- `src/App.tsx` - main routing and navigation
- `src/pages/` - dashboard, auction, team, player, and wheel pages
- `src/firebase.ts` - Firebase database setup
- `public/` - static assets and JSON data files

## Common usage

Once the app is running locally:

- Open the dashboard to view auction status
- Manage players and teams from the related pages
- Use the auction screen for live bidding flow
- Use the wheel picker to randomly pick players or teams

## Troubleshooting

### Error: Firebase configuration is invalid

Check that all values in `src/firebase.ts` match your Firebase project exactly.

### App does not start

Try the following:

```bash
npm install
npm start
```

If there are dependency issues, delete `node_modules` and reinstall:

```bash
rm -rf node_modules
npm install
```

On Windows PowerShell, use:

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

### Port already in use

If port 3000 is already occupied, stop the other process or adjust the `devServer.port` value in `webpack.config.js`.

## Notes

- `node_modules` is ignored by Git and should not be added to commits.
- This project is intended for local development and should be configured with your Firebase project before use.