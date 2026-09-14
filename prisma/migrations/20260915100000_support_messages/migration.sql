CREATE TABLE "SupportMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "fromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportMessage_userId_createdAt_idx" ON "SupportMessage"("userId", "createdAt");
CREATE INDEX "SupportMessage_isRead_createdAt_idx" ON "SupportMessage"("isRead", "createdAt");

ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
