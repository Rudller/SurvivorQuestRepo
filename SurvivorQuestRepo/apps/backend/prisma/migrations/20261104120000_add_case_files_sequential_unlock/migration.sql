-- Poszlaki odblokowywane po kolei (każde zaliczone zadanie drużyny = kolejna poszlaka).
ALTER TABLE "Realization" ADD COLUMN "caseFilesSequentialUnlock" BOOLEAN NOT NULL DEFAULT false;
