-- CreateTable
CREATE TABLE "portal_feedback_notes" (
    "id"               TEXT NOT NULL,
    "journal_entry_id" INTEGER NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'new',
    "note"             TEXT,
    "updated_at"       TIMESTAMP(3) NOT NULL,
    "updated_by"       TEXT NOT NULL,

    CONSTRAINT "portal_feedback_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_feedback_notes_journal_entry_id_key"
    ON "portal_feedback_notes"("journal_entry_id");
