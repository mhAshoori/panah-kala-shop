import { auth } from '@/auth';
import { withActionMessage } from './action-messages';

// Throw unless the current session belongs to an admin user.
// Used to guard admin pages and server actions.
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    throw new Error(await withActionMessage('unauthorized'));
  }
  return session;
}
