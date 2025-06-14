import { JWT } from "next-auth/jwt"

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    userId?: string
    twitterId?: string
  }
}