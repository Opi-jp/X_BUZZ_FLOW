import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from './prisma'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return null
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
  })

  return user
}