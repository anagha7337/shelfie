export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        }
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    try {
      // Parse request body
      const body = await request.json();
      const productName = body.productName;

      if (!productName || typeof productName !== 'string') {
        return new Response(
          JSON.stringify({ 
            error: "Missing or invalid productName",
            category: null
          }), 
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }

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

      const prompt = `Classify this product into ONE of these exact categories:
${categories.join(", ")}

Product: "${productName}"

Rules:
- Respond with ONLY the category name, nothing else
- Use the exact category name from the list above
- Use lowercase with hyphens (e.g., "food-groceries")

Category:`;

      // Call Groq API
      const groqResponse = await fetch(
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
              { 
                role: "system", 
                content: "You are a product categorization assistant. You only respond with category names, nothing else." 
              },
              { role: "user", content: prompt }
            ],
            temperature: 0,
            max_tokens: 20
          })
        }
      );

      if (!groqResponse.ok) {
        console.error("Groq API error:", await groqResponse.text());
        return new Response(
          JSON.stringify({ 
            error: "AI service unavailable",
            category: null
          }), 
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }

      const data = await groqResponse.json();
      let aiCategory = data.choices?.[0]?.message?.content?.trim().toLowerCase();

      // Clean up the response (remove any extra text)
      if (aiCategory) {
        // Remove common prefixes/suffixes
        aiCategory = aiCategory
          .replace(/^(category:|the category is:?|answer:?)/i, '')
          .trim()
          .toLowerCase();
        
        // Extract just the category name if there's extra text
        for (const cat of categories) {
          if (aiCategory.includes(cat)) {
            aiCategory = cat;
            break;
          }
        }
      }

      // Validate category
      const validCategory = categories.includes(aiCategory) ? aiCategory : null;

      console.log('Product:', productName, '→ AI:', aiCategory, '→ Valid:', validCategory);

      return new Response(
        JSON.stringify({
          category: validCategory,
          debug: {
            productName,
            rawAI: data.choices?.[0]?.message?.content,
            cleanedAI: aiCategory,
            valid: !!validCategory
          }
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );

    } catch (error) {
      console.error("Worker error:", error);
      return new Response(
        JSON.stringify({ 
          error: error.message,
          category: null
        }), 
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
  }
};