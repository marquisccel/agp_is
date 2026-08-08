import { authOptions } from "@/lib/authOptions";
﻿import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Selamat datang, {session.user?.name}</p>
      <p>Role: {session.user?.role}</p>
    </div>
  )
}