-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "SearchJobHistory" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "product" TEXT NOT NULL DEFAULT 'Top',
    "requestedLimit" INTEGER NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "result" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchJobHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentimentJobHistory" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "product" TEXT NOT NULL DEFAULT 'Top',
    "requestedLimit" INTEGER NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "positivePct" INTEGER NOT NULL DEFAULT 0,
    "negativePct" INTEGER NOT NULL DEFAULT 0,
    "neutralPct" INTEGER NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "result" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentimentJobHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchJobHistory_jobId_key" ON "SearchJobHistory"("jobId");

-- CreateIndex
CREATE INDEX "SearchJobHistory_query_idx" ON "SearchJobHistory"("query");

-- CreateIndex
CREATE INDEX "SearchJobHistory_status_createdAt_idx" ON "SearchJobHistory"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SentimentJobHistory_jobId_key" ON "SentimentJobHistory"("jobId");

-- CreateIndex
CREATE INDEX "SentimentJobHistory_query_idx" ON "SentimentJobHistory"("query");

-- CreateIndex
CREATE INDEX "SentimentJobHistory_status_createdAt_idx" ON "SentimentJobHistory"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Role_title_key" ON "Role"("title");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
