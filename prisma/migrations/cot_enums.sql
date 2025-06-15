-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'POSTED', 'FAILED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('NEW', 'RETWEET', 'QUOTE');

-- CreateEnum
CREATE TYPE "cot_session_status" AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED', 'PAUSED');

-- CreateEnum
CREATE TYPE "cot_phase_step" AS ENUM ('THINK', 'EXECUTE', 'INTEGRATE');

-- CreateEnum
CREATE TYPE "cot_phase_status" AS ENUM ('PENDING', 'THINKING', 'EXECUTING', 'INTEGRATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "cot_draft_status" AS ENUM ('DRAFT', 'EDITED', 'SCHEDULED', 'POSTED', 'ARCHIVED');

