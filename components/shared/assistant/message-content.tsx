'use client';

// Renders sanitized assistant text, turning internal markdown links into
// real anchors. parseAssistantContent only ever yields hrefs that resolve
// to this deployment — everything else degrades to plain text.

import Link from 'next/link';

import { parseAssistantContent } from '@/lib/ai/links';

const MessageContent = ({ content }: { content: string }) => {
  const segments = parseAssistantContent(content);
  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'link' ? (
          <Link
            key={i}
            href={seg.href}
            className='font-medium text-primary underline underline-offset-4 hover:text-primary/80'
          >
            {seg.label}
          </Link>
        ) : (
          <span key={i}>{seg.value}</span>
        )
      )}
    </>
  );
};

export default MessageContent;
