-- Newsletter opt-in list
CREATE TABLE "Subscriber" (
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscriber_pkey" PRIMARY KEY ("email")
);
