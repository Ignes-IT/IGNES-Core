/*
  Warnings:

  - The values [BASIC,PREMIUM] on the enum `Plan` will be removed. If these variants are still used in the database, this will fail.
  - The values [TRIAL] on the enum `SubStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Plan_new" AS ENUM ('FREE', 'TRIAL', 'PRO', 'BUSINESS');
ALTER TABLE "Subscription" ALTER COLUMN "plan" TYPE "Plan_new" USING ("plan"::text::"Plan_new");
ALTER TYPE "Plan" RENAME TO "Plan_old";
ALTER TYPE "Plan_new" RENAME TO "Plan";
DROP TYPE "Plan_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "SubStatus_new" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubStatus_new" USING ("status"::text::"SubStatus_new");
ALTER TYPE "SubStatus" RENAME TO "SubStatus_old";
ALTER TYPE "SubStatus_new" RENAME TO "SubStatus";
DROP TYPE "SubStatus_old";
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;
