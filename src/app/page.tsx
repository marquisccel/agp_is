import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from "@/lib/authOptions"
import { isOperationalRole } from "@/lib/roles"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    redirect('/login')
  }

  const role = session.user.role

  if (role === 'MANAGER') {
    redirect('/dashboard/manager')
  } else if (role === 'SUPERVISOR') {
    redirect('/dashboard/supervisor')
  } else if (isOperationalRole(role)) {
    redirect('/dashboard/staff')
  }

  // Fallback
  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-xl">Role tidak dikenali.</p>
    </div>
  )
}
