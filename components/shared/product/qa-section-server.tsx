import { getTranslations } from 'next-intl/server';

import QuestionList, {
  AskQuestionForm,
} from '@/components/shared/product/qa-section';
import { getProductQuestions } from '@/lib/actions/question.actions';
import { getValidUserId } from '@/lib/auth-helpers';

// Product page Q&A section: questions about this product + answers
const QaSectionServer = async ({ productId }: { productId: string }) => {
  const t = await getTranslations('qa');
  const [questions, userId] = await Promise.all([
    getProductQuestions(productId),
    getValidUserId(),
  ]);

  return (
    <section className='space-y-4 lg:col-span-2'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 className='h3-bold'>{t('questionsTitle')}</h2>
      </div>

      <AskQuestionForm productId={productId} signedIn={!!userId} />

      <QuestionList questions={questions} signedIn={!!userId} />
    </section>
  );
};

export default QaSectionServer;
