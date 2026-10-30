import { useEffect } from "react"
import { useAuth as useClerkAuth } from "@clerk/clerk-react"

import { setClerkState } from "@/lib/clerk"
import { useAuth } from "@/store/auth.store"

/** Mirrors Clerk's session into lib/clerk.ts and reloads the staff record when the session changes. */
export default function ClerkBridge() {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth()
  const signedIn = Boolean(isSignedIn)

  useEffect(() => {
    setClerkState({
      loaded: isLoaded,
      signedIn,
      getToken: () => getToken(),
      signOut: () => signOut(),
    })
    if (isLoaded) void useAuth.getState().loadMe()
  }, [isLoaded, signedIn, getToken, signOut])

  return null
}
