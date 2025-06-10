import { getServerSession } from 'next-auth'
import { prisma } from './prisma'

export async function getCurrentUser() {
  const session = await getServerSession()
  
  if (!session?.user?.email) {
    return null
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
  })

  return user
}