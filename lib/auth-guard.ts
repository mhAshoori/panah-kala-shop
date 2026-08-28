import { auth } from '@/auth';

// Throw unless the current session belongs to an admin user.
// Used to guard admin pages and server actions.
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    throw new Error('Unauthorized');
  }
  return session;
}
