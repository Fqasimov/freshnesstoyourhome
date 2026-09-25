import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { Intro } from '@/components/Intro'
import { useAuth } from '@/lib/auth'
import { color } from '@/theme/tokens'

/**
 * The opening: the website's animation, then onwards — straight into the
 * catalogue for someone already signed in on this phone, to sign-in or
 * sign-up for everyone else.
 *
 * The session check runs underneath the animation, so it costs no time of
 * its own; if the network is slower than the animation, the paper simply
 * holds for the moment it takes.
 */
export default function Index () {
  const auth = useAuth()
  const router = useRouter()
  const [played, setPlayed] = useState(false)

  useEffect(() => {
    if (!played || !auth.ready) return
    router.replace(auth.signedIn ? '/(tabs)/shop' : '/auth')
  }, [played, auth.ready, auth.signedIn, router])

  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      {!played ? <Intro onDone={() => setPlayed(true)} /> : null}
    </View>
  )
}
