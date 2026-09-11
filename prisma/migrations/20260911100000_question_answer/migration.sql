-- Q&A system: questions (productId null = general FAQ question) + answers
-- (user answers hidden until admin-approved; admin answers pre-approved)

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "productId" UUID,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_productId_idx" ON "Question"("productId");
CREATE INDEX "questions_userId_idx" ON "Question"("userId");
CREATE INDEX "answers_questionId_idx" ON "Answer"("questionId");
CREATE INDEX "answers_userId_idx" ON "Answer"("userId");

-- AddForeignKeys
ALTER TABLE "Question" ADD CONSTRAINT "questions_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "Question" ADD CONSTRAINT "questions_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "Answer" ADD CONSTRAINT "answers_questionId_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "Answer" ADD CONSTRAINT "answers_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
