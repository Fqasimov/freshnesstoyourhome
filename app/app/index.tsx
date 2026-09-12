import { Redirect } from 'expo-router'

// The shop is the front door. Browsing does not require an account: an app
// that is a login wall until you register is both worse to use and the shape
// App Store review rejects as an empty shell.
export default function Index () {
  return <Redirect href="/(tabs)/shop" />
}
