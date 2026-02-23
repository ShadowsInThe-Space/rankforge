-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "linkTierAnalysis" JSONB,
ADD COLUMN     "linkTierScore" INTEGER;
