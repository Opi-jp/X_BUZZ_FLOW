-- CreateTable
CREATE TABLE "perplexity_reports" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "rawAnalysis" TEXT NOT NULL,
    "trends" JSONB NOT NULL,
    "insights" JSONB NOT NULL,
    "personal_angles" JSONB NOT NULL,
    "buzz_prediction" DOUBLE PRECISION NOT NULL,
    "recommendations" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perplexity_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "perplexity_reports_created_at_idx" ON "perplexity_reports"("created_at");
