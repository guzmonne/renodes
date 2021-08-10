import { useContext, createContext, useMemo } from "react"
import type { ReactNode } from "react"

import { User } from "../models/user"
import type { UserBody } from "../models/user"

export interface UserContextValue {
  user?: User;
}

export interface UserProviderProps {
  userBody?: UserBody;
  children: ReactNode;
}

export const UserContext = createContext<UserContextValue>(undefined)

export function UserProvider({ userBody, children }: UserProviderProps) {
  const user = useMemo(() => userBody && new User(userBody), [userBody])

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  const context = useContext(UserContext)

  if (context === undefined) {
    throw new Error("useUserContext must be used withing a UserProvider")
  }

  return context
}