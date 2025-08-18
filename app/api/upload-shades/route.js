// app/api/upload-shades/route.js
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function POST(req) {
  const { brand, product, shades, category } = await req.json();

  if (!brand || !product || !shades || !category) {
    return Response.json({ success: false, error: "Missing fields" }, { status: 400 });
  }

  let shadeDict = {};

  if (category === "foundation" || category === "contour" || category === "concealer" || category === "skin-tint") {
    // Structure as: { skintone: { undertone: { shade_name: hex } } }
    for (const { name, hex, skintone, undertone } of shades) {
      if (!name || !hex || !skintone || !undertone) continue;

      if (!shadeDict[skintone]) shadeDict[skintone] = {};
      if (!shadeDict[skintone][undertone]) shadeDict[skintone][undertone] = {};
      shadeDict[skintone][undertone][name] = hex;
    }
  } else {
    // Default flat format
    for (const { name, hex } of shades) {
      if (name && hex) shadeDict[name] = hex;
    }
  }

  const jsonContent = JSON.stringify(shadeDict, null, 2);
  const bucket = process.env.AWS_BUCKET_NAME;

  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });

  const params = {
    Bucket: bucket,
    Key: `brands/${brand}/product_shade_values/${product}/shades.json`,
    Body: jsonContent,
    ContentType: "application/json"
  };

  try {
    await s3.send(new PutObjectCommand(params));
    return Response.json({ success: true }); // ✅ This was missing in some errors
  } catch (error) {
    console.error("S3 upload failed:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
