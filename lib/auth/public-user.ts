import db from '@/lib/db';

const PUBLIC_USER_EMAIL = 'public@openchat.local';

export async function ensurePublicUser(): Promise<{ id: string; email: string }> {
  const email = PUBLIC_USER_EMAIL;
  const name = 'Public';
  // Upsert by unique email to avoid duplicates
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role: 'USER' as any,
      // No password and no providers; cannot log in
      hashedPassword: null,
      image: null,
      settings: {},
    },
    select: { id: true, email: true },
  });
  return user;
}

export async function getPublicUserId(): Promise<string | null> {
  const row = await db.user.findUnique({ where: { email: PUBLIC_USER_EMAIL }, select: { id: true } });
  return row?.id || null;
}


