// Komponen server kecil untuk menyuntikkan structured data (JSON-LD) dengan aman.
// Pakai JSON.stringify — jangan inject string mentah.

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
