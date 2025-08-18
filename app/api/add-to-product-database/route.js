// app/api/add-to-product-database/route.js

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const brightnessThresholds = {
  neutrals: [[40, 59, "D"], [60, 74, "M"], [75, 100, "L"]],
  pinks: [[40, 59, "D"], [60, 74, "M"], [75, 100, "L"]],
  bold: [[0, 25, "D"], [26, 35, "M"], [36, 50, "L"]],
  bright: [[75, 80, "D"], [81, 90, "M"], [91, 100, "L"]],
  reds_browns: [[0, 35, "D"], [36, 60, "M"], [61, 80, "L"]],
  random: [[0, 50, "D"], [50, 70, "M"], [70, 100, "L"]]
};

function getPriceBucket(price, size = 500, max = 5000) {
  return price > max ? `${max}` : `${Math.floor(price / size) * size}`;
}

function getLMDBucketFromSkintone(skintone) {
  if (["F", "FM"].includes(skintone)) return "L";
  if (["MD", "D1"].includes(skintone)) return "M";
  if (["D2", "VD"].includes(skintone)) return "D";
  return null;
}

function getCategoriesFromHSV(h, s, v) {
  const categories = [];
  if (s > 40 && s < 65 && v > 35 && v < 70) categories.push("daily-neutrals");
  if (((h <= 8 || h >= 350) && s >= 45 && s <= 75 && v >= 40) || (h >= 325 && h < 350 && s >= 40 && v >= 50)) categories.push("perfect-pinks");
  if (s > 55 && v < 50) categories.push("bold-and-deep");
  if (s > 75 && v > 75) categories.push("bright-and-fun");
  if (h >= 0 && h <= 15 && s > 70 && v < 70) categories.push("reds-and-browns");
  categories.push("random");
  return categories;
}

function getLMDBucketFromBrightness(v, category) {
  const range = brightnessThresholds[category] || [];
  for (const [min, max, label] of range) {
    if (v >= min && v <= max) return label;
  }
  return null;
}

function insertShadeIntoDict(shade, dict, productCategory) {
  const hex = shade.shade_hex_code.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0, s = 0, v = max;
  s = max === 0 ? 0 : d / max;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  s *= 100;
  v *= 100;
  const v_scaled = Math.round(v);
  const priceBucket = getPriceBucket(shade.price);

  const isBaseProductCategory = ["foundation", "concealer", "skin-tint"].includes(productCategory);

  const isContourCategory = ["contour"].includes(productCategory);

  const categoryList = isBaseProductCategory ? [shade.coverage] : (isContourCategory ? [shade.finish] : getCategoriesFromHSV(h, s, v));

  const lmd = (isBaseProductCategory || isContourCategory)
    ? getLMDBucketFromSkintone(shade.skintone)
    : categoryList.map(cat => getLMDBucketFromBrightness(v_scaled, cat));

  for (let i = 0; i < categoryList.length; i++) {
    const category = categoryList[i];
    const lmdLabel = isBaseProductCategory ? lmd : lmd[i];

    if (!lmdLabel) continue;

    if (!dict[category]) dict[category] = {};
    if (!dict[category][priceBucket]) dict[category][priceBucket] = { L: [], M: [], D: [] };

    dict[category][priceBucket][lmdLabel].push({
      [`#${hex}`]: {
        brand: shade.brand,
        product_name: shade.product_name,
        shade_name: shade.shade_name,
        shade_hex_code: shade.shade_hex_code,
        price: shade.price,
        link: shade.link || "",
        type: shade.type
      }
    });
  }

  return dict;
}

export async function POST(req) {
  const { shades, product_category } = await req.json();
  const bucket = "truehue-backend-data";
  const key = `find_products/product_database/${product_category}/CategorisedLMD.json`;

  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  });

  let currentDict = {};

  try {
    const data = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const streamToString = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      });

    const jsonText = await streamToString(data.Body);
    currentDict = JSON.parse(jsonText);
  } catch (err) {
    if (err.Code === "NoSuchKey" || err.name === "NoSuchKey") {
      console.warn(`No existing dict found at ${key}. A new one will be created.`);
      currentDict = {};
    } else {
      console.error("Failed to load existing product database:", err);
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  try {
    for (const shade of shades) {
      insertShadeIntoDict(shade, currentDict, product_category);
    }

    const updatedJson = JSON.stringify(currentDict, null, 2);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: updatedJson,
      ContentType: "application/json"
    }));

    return Response.json({ success: true });
  } catch (err) {
    console.error("Product DB update failed:", err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
