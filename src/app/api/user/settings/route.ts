import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { createAuditLog } from '@/lib/audit';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { nama, email, oldPassword, newPassword } = body as {
      nama?: string;
      email?: string;
      oldPassword?: string;
      newPassword?: string;
    };

    // Diketik dengan tipe Prisma (bukan Record<string, string>) agar salah
    // nama field terdeteksi saat build. Sebelumnya nilai ditulis ke field
    // "name" yang tidak ada pada model User -- seharusnya "nama" -- sehingga
    // perubahan nama profil selalu gagal (D-12).
    const updateData: Prisma.UserUpdateInput = {};

    // Handle profile update (nama / email)
    if (nama !== undefined) {
      updateData.nama = nama;
    }

    if (email !== undefined) {
      // Check for email conflict with another user
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: 'Email sudah digunakan oleh pengguna lain' },
          { status: 409 },
        );
      }
      updateData.email = email;
    }

    // Handle password change
    if (newPassword && oldPassword) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user || !user.password) {
        return NextResponse.json(
          { error: 'User tidak ditemukan' },
          { status: 404 },
        );
      }

      const passwordMatch = await bcrypt.compare(oldPassword, user.password);
      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Password lama tidak sesuai' },
          { status: 400 },
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      updateData.password = hashedPassword;
    }

    // Apply all updates in a single Prisma call
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
      });

      // Catat perubahan akun pada audit log (D-5). Nilai password tidak
      // pernah disalin ke audit log -- hanya penanda bahwa password berubah.
      await createAuditLog({
        userId: session.user.id,
        action: 'UPDATE_USER_SETTINGS',
        table_name: 'User',
        record_id: session.user.id,
        old_data: { changed_fields: Object.keys(updateData) },
        new_data: {
          nama: updateData.nama ?? undefined,
          email: updateData.email ?? undefined,
          password_changed: updateData.password ? true : undefined,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUT /api/user/settings]', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 },
    );
  }
}
