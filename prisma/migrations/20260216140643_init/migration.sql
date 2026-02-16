-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "crawlJobId" TEXT,
    "pagesFound" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT[],
    "technical" JSONB,
    "content" JSONB,
    "links" JSONB,
    "summary" JSONB,
    "error" TEXT,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "statusCode" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "h1" TEXT,
    "wordCount" INTEGER,
    "markdown" TEXT,
    "html" TEXT,
    "links" JSONB,
    "headings" JSONB,
    "issues" JSONB,
    "score" INTEGER,
    "contentType" TEXT,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audit_domain_idx" ON "Audit"("domain");

-- CreateIndex
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE INDEX "Page_auditId_idx" ON "Page"("auditId");

-- CreateIndex
CREATE INDEX "Page_url_idx" ON "Page"("url");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
