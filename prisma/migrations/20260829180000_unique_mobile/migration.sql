-- Make mobile unique (multiple NULLs allowed) so sign-up can enforce
-- one account per phone number at the database level.
CREATE UNIQUE INDEX "user_mobile_idx" ON "User"("mobile");
