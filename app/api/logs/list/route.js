export const runtime = "nodejs";

import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_BUCKET_NAME;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").toLowerCase();

    const prefix = "brands/";
    let ContinuationToken = undefined;
    const results = [];

    do {
      const resp = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          Prefix: prefix,
          ContinuationToken,
        })
      );

      (resp.Contents || []).forEach((obj) => {
        const k = obj.Key || "";
        // brands/<brand>/product_shade_values/<product>/(file).json
        const m = k.match(
          /^brands\/([^/]+)\/product_shade_values\/([^/]+)\/(shades\.json|links\.json|price\.json|types?\.json)$/
        );
        if (m) {
          const [, brand, product] = m;
          const id = `${brand}:::${product}`;
          if (!results.find((r) => `${r.brand}:::${r.product}` === id)) {
            results.push({ brand, product });
          }
        }
      });

      ContinuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
    } while (ContinuationToken);

    const filtered = q
      ? results.filter(
          (r) =>
            r.brand.toLowerCase().includes(q) ||
            r.product.toLowerCase().includes(q)
        )
      : results;

    filtered.sort((a, b) =>
      a.brand === b.brand
        ? a.product.localeCompare(b.product)
        : a.brand.localeCompare(b.brand)
    );

    return new Response(JSON.stringify({ items: filtered }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || "List failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
