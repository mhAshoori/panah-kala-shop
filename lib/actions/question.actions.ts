'use server';

import { revalidatePath } from 'next/cache';
import { formatError } from '../utils';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import { prisma } from '@/db/prisma';
import { getValidUserId } from '../auth-helpers';
import type { Answer, Question, ActionState } from '@/types';

const QUESTION_MAX = 500;
const ANSWER_MAX = 1000;

export type QuestionWithDetails = Question & {
  user: { name: string };
  product?: { slug: string; name: string; nameFa: string } | null;
  answers: (Answer & { user: { name: string; role: string } })[];
};

// ---------------------------------------------------------------------------
// User actions
// ---------------------------------------------------------------------------

// Ask a question (product question when productId given, else general)
export async function askQuestion(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId) {
      throw new Error(await withActionMessage('sessionExpired'));
    }

    const body = String(formData.get('body') ?? '').trim();
    const productId = (formData.get('productId') as string) || null;
    if (body.length < 5 || body.length > QUESTION_MAX) {
      throw new Error(await withActionMessage('questionInvalid'));
    }

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { slug: true },
      });
      if (!product) throw new Error(await withActionMessage('productNotFound'));
    }

    await prisma.question.create({ data: { userId, productId, body } });

    if (productId) {
      const slug = await prisma.product
        .findUnique({ where: { id: productId }, select: { slug: true } })
        .then((p) => p?.slug);
      if (slug) revalidatePath(`/product/${slug}`);
    } else {
      revalidatePath('/faq');
    }
    revalidatePath('/user/questions');

    return { success: true, message: await withActionMessage('questionSaved') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Answer a question. Storefront answers start unapproved (admin must confirm);
// admin answers are pre-approved. Authors always see their own answers.
export async function answerQuestion(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId) {
      throw new Error(await withActionMessage('sessionExpired'));
    }

    const questionId = formData.get('questionId') as string;
    const body = String(formData.get('body') ?? '').trim();
    if (body.length < 2 || body.length > ANSWER_MAX) {
      throw new Error(await withActionMessage('answerInvalid'));
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { product: { select: { slug: true } } },
    });
    if (!question) throw new Error(await withActionMessage('questionNotFound'));

    const isAdmin = await prisma.user
      .findUnique({ where: { id: userId }, select: { role: true } })
      .then((u) => u?.role === 'admin');

    await prisma.answer.create({
      data: { questionId, userId, body, isApproved: isAdmin },
    });

    if (question.product?.slug) {
      revalidatePath(`/product/${question.product.slug}`);
    } else {
      revalidatePath('/faq');
    }
    revalidatePath('/user/questions');
    revalidatePath('/admin/reviews');

    return {
      success: true,
      message: await withActionMessage(isAdmin ? 'answerSaved' : 'answerPending'),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Delete the signed-in user's own question (only if no answers yet)
export async function deleteMyQuestion(
  questionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const userId = await getValidUserId();
    if (!userId) {
      throw new Error(await withActionMessage('sessionExpired'));
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { _count: { select: { answers: true } } },
    });
    if (!question || question.userId !== userId) {
      throw new Error(await withActionMessage('questionNotFound'));
    }
    if (question._count.answers > 0) {
      throw new Error(await withActionMessage('questionHasAnswers'));
    }

    await prisma.question.delete({ where: { id: questionId } });
    revalidatePath('/user/questions');
    revalidatePath('/faq');
    return { success: true, message: await withActionMessage('questionDeleted') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}

// Delete the signed-in user's own answer
export async function deleteMyAnswer(
  answerId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const userId = await getValidUserId();
    if (!userId) {
      throw new Error(await withActionMessage('sessionExpired'));
    }

    const answer = await prisma.answer.findUnique({ where: { id: answerId } });
    if (!answer || answer.userId !== userId) {
      throw new Error(await withActionMessage('answerNotFound'));
    }

    await prisma.answer.delete({ where: { id: answerId } });

    const question = await prisma.question.findUnique({
      where: { id: answer.questionId },
      include: { product: { select: { slug: true } } },
    });
    if (question?.product?.slug) {
      revalidatePath(`/product/${question.product.slug}`);
    } else {
      revalidatePath('/faq');
    }
    revalidatePath('/user/questions');
    return { success: true, message: await withActionMessage('answerDeleted') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}

// ---------------------------------------------------------------------------
// Read queries
// ---------------------------------------------------------------------------

// Approved answers + the current user's own (pending included) for a question set
function visibleAnswers(
  answers: (Answer & { user: { name: string; role: string } })[],
  currentUserId: string | null
) {
  return answers.filter(
    (a) => a.isApproved || a.userId === currentUserId
  );
}

// Questions for one product (with visible answers) — product page section
export async function getProductQuestions(productId: string) {
  const userId = await getValidUserId();
  const data = await prisma.question.findMany({
    where: { productId },
    include: {
      user: { select: { name: true } },
      answers: { include: { user: { select: { name: true, role: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const questions = data.map((q) => ({
    ...q,
    answers: visibleAnswers(q.answers, userId ?? null),
  }));

  return JSON.parse(JSON.stringify(questions)) as QuestionWithDetails[];
}

// Approved general questions + answers for the FAQ page (public)
export async function getFaqQuestions() {
  const userId = await getValidUserId();
  const data = await prisma.question.findMany({
    where: { productId: null },
    include: {
      user: { select: { name: true } },
      answers: { include: { user: { select: { name: true, role: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const questions = data
    .map((q) => ({
      ...q,
      answers: visibleAnswers(q.answers, userId ?? null),
    }))
    .filter((q) => q.answers.length > 0 || q.userId === (userId ?? null));

  return JSON.parse(JSON.stringify(questions)) as QuestionWithDetails[];
}

// The signed-in user's own questions + answers (for /user/questions)
export async function getMyQuestions() {
  const userId = await getValidUserId();
  if (!userId) return [];

  const data = await prisma.question.findMany({
    where: { userId },
    include: {
      user: { select: { name: true } },
      product: { select: { slug: true, name: true, nameFa: true } },
      answers: { include: { user: { select: { name: true, role: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Also questions the user answered but didn't ask
  const answeredIds = await prisma.answer.findMany({
    where: { userId, NOT: { question: { userId } } },
    select: { questionId: true },
    distinct: ['questionId'],
  });

  const answeredQuestions = await prisma.question.findMany({
    where: { id: { in: answeredIds.map((a) => a.questionId) } },
    include: {
      user: { select: { name: true } },
      product: { select: { slug: true, name: true, nameFa: true } },
      answers: { include: { user: { select: { name: true, role: true } } } },
    },
  });

  const all = [...data, ...answeredQuestions].map((q) => ({
    ...q,
    answers: visibleAnswers(q.answers, userId),
  }));

  return JSON.parse(JSON.stringify(all)) as (QuestionWithDetails & {
    product?: { slug: string; name: string; nameFa: string } | null;
    askedByMe: boolean;
  })[];
}

// ---------------------------------------------------------------------------
// Admin moderation
// ---------------------------------------------------------------------------

// All questions (admin) — product + general, with all answers regardless of approval
export async function getAllQuestionsAdmin() {
  await requireAdmin();

  const data = await prisma.question.findMany({
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { slug: true, name: true, nameFa: true } },
      answers: { include: { user: { select: { name: true, role: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return JSON.parse(JSON.stringify(data)) as (QuestionWithDetails & {
    user: { name: string; email: string };
  })[];
}

// Approve / un-approve an answer (admin)
export async function setAnswerApproval(
  answerId: string,
  isApproved: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    await requireAdmin();
    const answer = await prisma.answer.findUnique({ where: { id: answerId } });
    if (!answer) throw new Error(await withActionMessage('answerNotFound'));

    await prisma.answer.update({ where: { id: answerId }, data: { isApproved } });

    const question = await prisma.question.findUnique({
      where: { id: answer.questionId },
      include: { product: { select: { slug: true } } },
    });
    if (question?.product?.slug) {
      revalidatePath(`/product/${question.product.slug}`);
    } else {
      revalidatePath('/faq');
    }
    revalidatePath('/admin/reviews');
    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}

// Delete a question (admin) — cascades to its answers
export async function deleteQuestionAdmin(
  questionId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await requireAdmin();
    await prisma.question.delete({ where: { id: questionId } });
    revalidatePath('/admin/reviews');
    revalidatePath('/faq');
    return { success: true, message: await withActionMessage('questionDeleted') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}

// Delete an answer (admin)
export async function deleteAnswerAdmin(
  answerId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await requireAdmin();
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: { question: { include: { product: { select: { slug: true } } } } },
    });
    if (!answer) throw new Error(await withActionMessage('answerNotFound'));

    await prisma.answer.delete({ where: { id: answerId } });

    if (answer.question.product?.slug) {
      revalidatePath(`/product/${answer.question.product.slug}`);
    } else {
      revalidatePath('/faq');
    }
    revalidatePath('/admin/reviews');
    return { success: true, message: await withActionMessage('answerDeleted') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}

// Admin answers a general (FAQ) question directly
export async function adminAnswerQuestion(
  questionId: string,
  body: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await requireAdmin();
    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) throw new Error(await withActionMessage('unauthorized'));

    const trimmed = body.trim();
    if (trimmed.length < 2 || trimmed.length > ANSWER_MAX) {
      throw new Error(await withActionMessage('answerInvalid'));
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { product: { select: { slug: true } } },
    });
    if (!question) throw new Error(await withActionMessage('questionNotFound'));

    const sessionAdminId = await getValidUserId();
    await prisma.answer.create({
      data: {
        questionId,
        userId: sessionAdminId ?? admin.id,
        body: trimmed,
        isApproved: true,
      },
    });

    if (question.product?.slug) {
      revalidatePath(`/product/${question.product.slug}`);
    } else {
      revalidatePath('/faq');
    }
    revalidatePath('/admin/reviews');
    return { success: true, message: await withActionMessage('answerSaved') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}
