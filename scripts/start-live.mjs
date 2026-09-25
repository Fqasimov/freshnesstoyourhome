// Start the app for Expo Go against the live server — one command, and the
// same on Windows and macOS (an inline VAR=value prefix is not).
//
//   cd app && npm run start:live
//
// Real builds take the address from eas.json; this is only for trying the
// app on a phone by scanning the QR code.
import { spawn } from 'node:child_process'

const child = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, EXPO_PUBLIC_API_URL: 'https://freshnesstoyourhome.az/server' },
})
child.on('exit', code => process.exit(code ?? 0))
