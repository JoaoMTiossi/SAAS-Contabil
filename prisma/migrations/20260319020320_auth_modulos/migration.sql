/*
  Warnings:

  - Added the required column `senha` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "senha" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EscritorioModulo" (
    "id" TEXT NOT NULL,
    "escritorioId" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,

    CONSTRAINT "EscritorioModulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EscritorioModulo_escritorioId_modulo_key" ON "EscritorioModulo"("escritorioId", "modulo");

-- AddForeignKey
ALTER TABLE "EscritorioModulo" ADD CONSTRAINT "EscritorioModulo_escritorioId_fkey" FOREIGN KEY ("escritorioId") REFERENCES "Escritorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
