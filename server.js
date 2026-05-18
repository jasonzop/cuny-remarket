// server.ts
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import nodemailer from "nodemailer";
import { randomInt } from "crypto";
function normalizeWalmart(item) {
  return {
    product_id: item.product_id ?? item.us_item_id,
    title: item.title,
    link: item.product_page_url,
    thumbnail: item.thumbnail,
    price:
      item.primary_offer?.offer_price != null
        ? `$${item.primary_offer.offer_price}`
        : undefined,
    old_price:
      item.primary_offer?.was_price != null
        ? `$${item.primary_offer.was_price}`
        : undefined,
    extracted_price: item.primary_offer?.offer_price,
    rating: item.rating,
    reviews: item.reviews,
  };
}

function normalizeEbay(item) {
  return {
    product_id: item.epid ?? item.item_id,
    title: item.title,
    link: item.link,
    thumbnail: item.thumbnail,
    price: item.price?.raw,
    extracted_price: item.price?.extracted,
    rating: item.rating,
    reviews: item.reviews_count,
  };
}

const normalizerMap = {
  walmart: normalizeWalmart,
  ebay: normalizeEbay,
};

function normalizeProduct(retailer, item) {
  const normalizer = normalizerMap[retailer];
  if (!normalizer) {
    console.warn(`No normalizer found for retailer: ${retailer}`);
    return item;
  }
  return normalizer(item);
}

function normalizeKeyword(keyword) {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "for",
    "with",
    "and",
    "or",
    "of",
    "to",
    "buy",
    "best",
    "cheap",
    "new",
    "online",
    "sale",
    "shop",
  ]);

  return keyword
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // remove punctuation
    .split(/\s+/) // split words
    .filter((word) => word && !stopWords.has(word)) // remove stop words
    .map((word) => {
      // simple plural normalization
      if (word.endsWith("s") && word.length > 3) {
        return word.slice(0, -1);
      }
      return word;
    })
    .sort() // order words for consistent cache keys
    .join(""); // <-- join without spaces
}

// Vite automatically uses .env locally or environment variables in production
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and key are required!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();
const PORT = 3001;
const CUNY_EMAIL_DOMAIN = "@login.cuny.edu";
const signupCodes = new Map();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const geminiModel = genAI.getGenerativeModel({
  model: "gemini-flash-lite-latest"
});

const engineConfig = (keyword) => ({
  amazon: {
    engine: "amazon",
    amazon_domain: "amazon.com",
    k: keyword,
  },
  walmart: {
    engine: "walmart",
    query: keyword,
  },
  ebay: {
    engine: "ebay",
    _nkw: keyword,
  },
  home_depot: {
    engine: "home_depot",
    q: keyword,
  },
  "google-shopping": {
    engine: "google_shopping",
    q: keyword,
    google_domain: "google.com",
    gl: "us",
    hl: "en",
  },
});

app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

const mailer =
  process.env.EMAIL_HOST &&
  process.env.EMAIL_PORT &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      })
    : null;

function isCunyEmail(email) {
  return email.trim().toLowerCase().endsWith(CUNY_EMAIL_DOMAIN);
}

function createSignupCode() {
  return randomInt(100000, 1000000).toString();
}

app.post("/api/auth/send-signup-code", async (req, res) => {
  const username = String(req.body.username ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing signup information." });
  }

  if (!isCunyEmail(email)) {
    return res.status(400).json({
      error: "Only CUNY emails ending with @login.cuny.edu are allowed.",
    });
  }

  if (!mailer) {
    return res.status(500).json({
      error: "Email sender is not configured on the backend.",
    });
  }

  const code = createSignupCode();
  signupCodes.set(email, {
    code,
    username,
    email,
    password,
    attempts: 0,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  try {
    await mailer.sendMail({
      from:
        process.env.EMAIL_FROM ??
        `CUNY ReMarket <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your CUNY ReMarket verification code",
      text: `Your CUNY ReMarket verification code is ${code}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #17120c;">
          <h2>CUNY ReMarket</h2>
          <p>Your verification code is:</p>
          <p style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #5f2d90;">${code}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("SIGNUP EMAIL ERROR:", error);
    signupCodes.delete(email);
    if (error?.code === "EAUTH") {
      return res.status(500).json({
        error:
          "Gmail rejected the email username/password. Create a new Gmail app password and update EMAIL_PASS.",
      });
    }
    res.status(500).json({ error: "Could not send verification email." });
  }
});

app.post("/api/auth/verify-signup-code", async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const code = String(req.body.code ?? "").trim();
  const pending = signupCodes.get(email);

  if (!pending) {
    return res.status(400).json({ error: "No pending signup code found." });
  }

  if (Date.now() > pending.expiresAt) {
    signupCodes.delete(email);
    return res.status(400).json({ error: "Verification code expired." });
  }

  if (pending.attempts >= 5) {
    signupCodes.delete(email);
    return res.status(429).json({ error: "Too many incorrect attempts." });
  }

  if (pending.code !== code) {
    pending.attempts += 1;
    return res.status(400).json({ error: "Invalid verification code." });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: pending.email,
    password: pending.password,
    email_confirm: true,
    user_metadata: { username: pending.username },
  });

  if (error) {
    console.error("SUPABASE CREATE USER ERROR:", error);
    return res.status(400).json({ error: error.message });
  }

  signupCodes.delete(email);
  res.json({ ok: true, userId: data.user?.id });
});

app.post("/api/auth/complete-signup-profile", async (req, res) => {
  const userId = String(req.body.userId ?? "").trim();
  const username = String(req.body.username ?? "").trim();
  const fullName = String(req.body.fullName ?? "").trim();
  const campus = String(req.body.campus ?? "").trim();
  const major = String(req.body.major ?? "").trim();
  const graduationYear = String(req.body.graduationYear ?? "").trim();
  const bio = String(req.body.bio ?? "").trim();

  if (!userId || !username || !campus) {
    return res.status(400).json({
      error: "Missing profile information.",
    });
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        username,
        full_name: fullName,
        campus,
        major,
        graduation_year: graduationYear,
        bio,
      },
    }
  );

  if (authError) {
    console.error("SUPABASE UPDATE USER ERROR:", authError);
    return res.status(400).json({ error: authError.message });
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      username,
      full_name: fullName,
      campus,
      major,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("SUPABASE PROFILE UPSERT ERROR:", profileError);
    return res.status(400).json({ error: profileError.message });
  }

  res.json({ ok: true });
});

app.get("/api/search", async (req, res) => {
  const { keyword, engines } = req.query;

  if (!keyword) return res.status(400).json({ error: "Missing keyword" });

  const config = engineConfig(keyword);
  console.log("raw query:", req.query);
  console.log("engines raw value:", req.query.engines);
  console.log("config keys:", Object.keys(config));

  console.log("KEYWORD: ", keyword);

  // Parse engines from comma-separated string, fallback to amazon
  const selectedEngines = engines
    ? engines.split(",").filter((e) => config[e])
    : ["amazon"];

  if (selectedEngines.length === 0) {
    return res.status(400).json({ error: "No valid engines provided" });
  }

  try {
    const requests = selectedEngines.map(async (engine) => {
      const result = await axios
        .get("https://serpapi.com/search.json", {
          params: {
            ...config[engine],
            api_key: process.env.SERPAPI_KEY,
          },
        })
        .then((r) => ({ retailer: engine, data: r.data }))
        .catch((err) => ({ retailer: engine, error: err.message }));
      console.log("DATA RESULT: ", result.data);

      if (result.data) {
        const normalizedKeyword = normalizeKeyword(keyword);

        const { error: jsonInsertError } = await supabase
          .from("cached_searches")
          .insert([
            {
              search_term: normalizedKeyword,
              search_json: result,
              retailer: engine,
            },
          ]);

        if (jsonInsertError) {
          console.error("SUPABASE INSERT ERROR:", jsonInsertError);
          return null;
        }

        // Read back from Supabase immediately
        const { data: cachedSearch, error: fetchError } = await supabase
          .from("cached_searches")
          .select("search_json")
          .eq("search_term", normalizedKeyword)
          .eq("retailer", engine)
          .order("created_at", { ascending: false })
          .limit(1);

        if (fetchError || !cachedSearch?.length) {
          console.error("Failed to read back from Supabase:", fetchError);
          return null;
        }

        const raw = cachedSearch[0].search_json;
        const searchData = raw.data;

        const products = [
          ...(searchData?.featured_products || []),
          ...(searchData?.organic_results || []),
          ...(searchData?.shopping_results || []),
        ].map((item) => ({
          ...normalizeProduct(engine, item),
          retailer: engine,
        }));

        return { retailer: engine, products };
      }

      return null;
    });

    const results = await Promise.all(requests);
    const allProducts = results.flatMap((r) => r?.products || []);

    console.log("Total products:", allProducts.length);
    res.json({ products: allProducts });
  } catch (err) {
    console.error("Search API error:", err.message);
    res.status(500).json({ error: "Failed to fetch search results" });
  }
});

app.get("/api/product-data", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Missing product query" });

  try {
    const response = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google_shopping",
        q: query,
        api_key: process.env.SERPAPI_KEY,
      },
    });

    const result = response.data.shopping_results?.[0];

    if (!result) {
      return res.json({
        price: null,
        rating: null,
        reviews: null,
        seller: null,
        product_url: null,
        review_url: null,
      });
    }

    const product_url = result.product_link || result.link || null;
    let review_url = result.reviews_link || null;
    if (!review_url && result.google_product_id) {
      review_url = `https://www.google.com/shopping/product/${result.google_product_id}/reviews`;
    }

    res.json({
      price: result.price || null,
      rating: result.rating || null,
      reviews: result.reviews || null,
      seller: result.source || null,
      product_url,
      review_url,
    });
  } catch (err) {
    console.error("Product data error:", err.message);
    res.status(500).json({ error: "Failed to fetch product data" });
  }
});

app.get("/api/serp-usage", async (req, res) => {
  try {
    const response = await axios.get("https://serpapi.com/account.json", {
      params: { api_key: process.env.SERPAPI_KEY },
    });

    res.json({
      this_month_usage: response.data.this_month_usage,
      plan_searches_left: response.data.plan_searches_left,
    });
  } catch (err) {
    console.error("SerpAPI usage fetch failed:", err.message);
    res.status(500).json({ error: "Failed to fetch usage" });
  }
});
app.post("/api/ai-search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        error: "Missing query",
      });
    }

const prompt = `
You are an AI marketplace search assistant for CUNY ReMarket.

Your job is to infer student intent.

Examples:

"cs textbooks"
→ {
  "department": "Computer Science",
  "category": "Textbooks"
}

"math books"
→ {
  "department": "Mathematics",
  "category": "Textbooks"
}

"psych notes"
→ {
  "department": "Psychology",
  "category": "Study Materials"
}

"hunter merch"
→ {
  "college": "Hunter",
  "category": "Merch"
}

"calc book under 50"
→ {
  "department": "Mathematics",
  "category": "Textbooks",
  "maxPrice": 50
}

Infer abbreviations:
- cs = Computer Science
- comp sci = Computer Science
- math = Mathematics
- psych = Psychology
- econ = Economics
- bio = Biology
- chem = Chemistry

Return ONLY valid JSON.

Convert the student's search into marketplace search filters.

Return ONLY valid JSON.

Example:

{
  "keywords": ["computer science", "csci", "textbook"],
  "college": "Hunter",
  "department": "Computer Science",
  "category": "Textbooks",
  "maxPrice": 40
}

User search:
${query}
`;

    const result = await geminiModel.generateContent(prompt);

    const text = result.response.text();

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    res.json(parsed);
  } catch (error) {
    console.error("AI SEARCH ERROR:", error);

res.status(500).json({
  error: "AI search failed",
  details: error.message,
});
  }
});
const server = app.listen(PORT, () =>
  console.log(`Backend running at http://localhost:${PORT}`)
);

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the old backend before running npm start again.`
    );
    process.exit(1);
  }

  throw error;
});
