import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import QuestionList, {
  AskQuestionForm,
} from '@/components/shared/product/qa-section';
import { getFaqQuestions } from '@/lib/actions/question.actions';
import { getValidUserId } from '@/lib/auth-helpers';
import { buildAlternates, getSiteUrl } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('qa');
  return {
    title: t('faqTitle'),
    description: t('faqDesc'),
    alternates: buildAlternates('/faq'),
    openGraph: { url: `${getSiteUrl()}/faq` },
  };
}

const FaqPage = async () => {
  const t = await getTranslations('qa');
  const [questions, userId] = await Promise.all([
    getFaqQuestions(),
    getValidUserId(),
  ]);

  return (
    <div className='mx-auto max-w-3xl space-y-6 py-4'>
      <div className='space-y-1'>
        <h1 className='h2-bold'>{t('faqTitle')}</h1>
        <p className='text-sm text-muted-foreground'>{t('faqDesc')}</p>
      </div>

      <div className='rounded-xl border bg-card p-4'>
        <h2 className='mb-1 text-lg font-semibold'>{t('faqAskTitle')}</h2>
        <p className='mb-3 text-sm text-muted-foreground'>{t('faqAskDesc')}</p>
        <AskQuestionForm signedIn={!!userId} />
      </div>

      <QuestionList questions={questions} signedIn={!!userId} />
    </div>
  );
};

export default FaqPage;
