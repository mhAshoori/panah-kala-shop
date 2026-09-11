import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import QuestionList from '@/components/shared/product/qa-section';
import { getMyQuestions } from '@/lib/actions/question.actions';
import { auth } from '@/auth';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('qa');
  return { title: t('myQuestions') };
}

const MyQuestionsPage = async () => {
  const session = await auth();
  if (!session) redirect('/sign-in?callbackUrl=%2Fuser%2Fquestions');

  const t = await getTranslations('qa');
  const questions = await getMyQuestions();

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>{t('myQuestions')}</h1>
      <QuestionList questions={questions} signedIn showProductLink />
    </div>
  );
};

export default MyQuestionsPage;
