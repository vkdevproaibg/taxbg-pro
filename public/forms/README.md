# NAP Official PDF Forms

Place official fillable PDFs from nap.bg here when available:

- `dds_official.pdf`  — Справка-декларация по ЗДДС
  Download: https://nap.bg/page?id=392

- `zkpo_official.pdf` — Годишна декларация по ЗКПО
  Download: https://nap.bg/page?id=393

## When NAP publishes updated forms

1. Download new PDF from nap.bg
2. Check actual field names:
   `pdftk form.pdf dump_data_fields output fields.txt`
3. Update `src/constants/nap-schemas.ts` — version + effectiveFrom
4. Replace PDF file here
5. Run `npm run build` to verify no TypeScript errors
