DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='Measurement'
      AND column_name='acketLoss'
  ) THEN
    EXECUTE 'ALTER TABLE "Measurement" RENAME COLUMN "acketLoss" TO "packetLoss"';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='Measurement'
      AND column_name='packetLoss'
  ) THEN
    EXECUTE 'ALTER TABLE "Measurement" ADD COLUMN "packetLoss" double precision';
  END IF;
END $$;