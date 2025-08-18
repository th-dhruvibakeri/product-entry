export async function POST(req) {
  try {
    const body = await req.json();
    const { title, vendor, productType, tags } = body;

    const res = await fetch(`https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2024-01/products.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_API_TOKEN
      },
      body: JSON.stringify({
        product: {
          title,
          vendor,
          product_type: productType,
          tags,
          published: true,
        }
      })
    });

    


    const result = await res.json();

    if (res.ok) {
      return Response.json({ success: true, result });
    } else {
      console.error(result);
      return Response.json({ success: false, error: result.errors });
    }

  } catch (err) {
    console.error(err);
    return Response.json({ success: false, error: err.message });
  }
}
