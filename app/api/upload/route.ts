import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { rateLimit } from '@/lib/rate-limit';
import { uploadImage, UploadError, isStorageConfigured } from '@/lib/storage';

// POST /api/upload — multipart/form-data { file, folder }
// Authorization: admins may upload anywhere; users only their own avatar.
// Stores nothing in the DB itself — the caller saves the returned URL.

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!(await isStorageConfigured())) {
    return NextResponse.json(
      { error: 'not_configured', message: 'storageNotConfigured' },
      { status: 503 }
    );
  }

  const ip = req.headers.get('x-forwarded-for') ?? 'local';
  const rl = rateLimit(
    `upload:${session.user.id ?? ip}`,
    20,
    10 * 60 * 1000
  );
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const file = form.get('file');
  const folderRaw = String(form.get('folder') ?? '');

  const isAdmin = session.user.role === 'admin';
  const allowedFolders = isAdmin
    ? ['products', 'content', 'avatars']
    : ['avatars'];
  if (!allowedFolders.includes(folderRaw)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const folder = folderRaw as 'products' | 'avatars' | 'content';

  try {
    const url = await uploadImage(file as File, folder);
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: 'upload_failed', message: error.message },
        { status: 400 }
      );
    }
    console.error(
      '[storage] upload failed:',
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ error: 'upload_failed' }, { status: 502 });
  }
}
