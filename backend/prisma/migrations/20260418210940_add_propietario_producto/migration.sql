/*
  Warnings:

  - Added the required column `propietarioId` to the `productos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: add nullable first, set value, then make NOT NULL
ALTER TABLE "productos" ADD COLUMN "propietarioId" INTEGER;

-- Set all existing products to Carlos (propietario_carlos)
UPDATE "productos" SET "propietarioId" = (
  SELECT id FROM "usuarios" WHERE rol = 'propietario_carlos' LIMIT 1
);

-- Now make NOT NULL
ALTER TABLE "productos" ALTER COLUMN "propietarioId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
