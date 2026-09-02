'use client';

// Client helper: upload one file to /api/upload and return the public URL.
// messageKey is a translations-friendly error key (storageTooLarge etc.).

export async function uploadFile(
  file: File,
  folder: 'products' | 'avatars' | 'content'
): Promise<{ url?: string; messageKey?: string }> {
  const body = new FormData();
  body.append('file', file);
  body.append('folder', folder);

  try {
    const res = await fetch('/api/upload', { method: 'POST', body });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      message?: string;
      error?: string;
    };
    if (res.ok && json.url) return { url: json.url };
    return { messageKey: json.message ?? 'uploadFailed' };
  } catch {
    return { messageKey: 'uploadFailed' };
  }
}
