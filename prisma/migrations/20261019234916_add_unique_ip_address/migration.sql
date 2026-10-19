/*
  Warnings:

  - A unique constraint covering the columns `[ipAddress]` on the table `Device` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Device_ipAddress_key" ON "Device"("ipAddress");
