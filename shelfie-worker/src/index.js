export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });
    }

    const { productName } = await request.json();

    const categories = [
      "food-groceries",
      "diary-bakery",
      "snack-beverages",
      "personal-care",
      "laundry-cleaning",
      "health-pharmacy",
      "household",
      "stationary"
    ];

    const prompt = `
Classify this product into ONE of these categories:
${categories.join(", ")}

Product: ${productName}
Respond only with the category name.
`;

    const grokResponse = await fetch(
  "https://api.groq.com/openai/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.GROQ_SHELFIE}`
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: [
        { role: "system", content: "You classify products." },
        { role: "user", content: prompt }
      ],
      temperature: 0
    })
  }
);


    const data = await grokResponse.json();
    const aiCategory =
      data.choices?.[0]?.message?.content?.trim().toLowerCase();

    return new Response(
      JSON.stringify({
        category: categories.includes(aiCategory)
          ? aiCategory
          : null
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
};
