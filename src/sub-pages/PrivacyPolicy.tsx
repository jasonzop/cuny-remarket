import { useEffect } from "react";
import { useTheme } from "../Contexts/ThemeContext";

export default function PrivacyPolicy() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const numStyle = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 500,
    color: isDark ? "#0b0f1a" : "#fff",
    background: isDark ? "#e4e4e7" : "#1a1a2e",
    borderRadius: "50%",
    width: 22,
    height: 22,
    display: "inline-flex" as const,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const dividerStyle = {
    border: "none",
    borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#eee"}`,
    margin: "32px 0",
  };

  const pStyle = { color: isDark ? "#a1a1aa" : "#444" };
  const titleStyle = { color: isDark ? "#f4f4f5" : "#1a1a2e" };
  const subStyle = { color: isDark ? "#52525b" : "#888" };
  const dashStyle = {
    position: "absolute" as const,
    left: 0,
    color: isDark ? "#3f3f46" : "#ccc",
  };

  const SectionTitle = ({
    num,
    children,
  }: {
    num: number;
    children: string;
  }) => (
    <h2 className="pp-section-title" style={titleStyle}>
      <span style={numStyle}>{num}</span>
      {children}
    </h2>
  );

  const BulletList = ({ items }: { items: string[] }) => (
    <ul className="pp-ul">
      {items.map((item) => (
        <li key={item} style={pStyle}>
          <span style={dashStyle}>-</span>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className="min-h-screen py-12 px-6"
      style={{
        background: isDark ? "#0b0f1a" : "#f7f5f0",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        .pp-container { max-width: 780px; margin: 0 auto; border-radius: 4px; padding: 64px 72px; }
        .pp-brand { font-family: 'Fraunces', serif; font-size: 13px; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 12px; }
        .pp-title { font-family: 'Fraunces', serif; font-size: 42px; font-weight: 700; line-height: 1.1; margin-bottom: 8px; }
        .pp-effective { font-size: 13px; margin-bottom: 48px; font-weight: 300; }
        .pp-intro { font-size: 15px; line-height: 1.8; margin-bottom: 48px; padding-bottom: 48px; }
        .pp-section { margin-bottom: 40px; }
        .pp-section-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
        .pp-sub { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; margin-top: 20px; }
        .pp-p { font-size: 14.5px; line-height: 1.85; margin-bottom: 12px; }
        .pp-ul { list-style: none; margin: 8px 0 12px 0; padding: 0; }
        .pp-ul li { font-size: 14.5px; line-height: 1.8; padding: 4px 0 4px 20px; position: relative; }
        .pp-contact { border-radius: 4px; padding: 24px 28px; margin-top: 12px; }
        .pp-contact-name { font-weight: 500; font-size: 15px; margin-bottom: 6px; }
        .pp-contact a { text-decoration: underline; text-underline-offset: 3px; }
        @media (max-width: 640px) { .pp-container { padding: 36px 24px; } .pp-title { font-size: 30px; } }
      `}</style>

      <div
        className="pp-container"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
          boxShadow: isDark
            ? "0 2px 40px rgba(0,0,0,0.3)"
            : "0 2px 40px rgba(0,0,0,0.07)",
        }}
      >
        <p className="pp-brand" style={subStyle}>
          CUNY ReMarket
        </p>
        <h1 className="pp-title" style={titleStyle}>
          Privacy Policy
        </h1>
        <p
          className="pp-effective"
          style={{ color: isDark ? "#52525b" : "#aaa" }}
        >
          Effective Date: May 18, 2026
        </p>

        <p
          className="pp-intro"
          style={{
            ...pStyle,
            borderBottom: `1px solid ${
              isDark ? "rgba(255,255,255,0.08)" : "#eee"
            }`,
          }}
        >
          CUNY ReMarket is a student marketplace for buying, selling, saving,
          reviewing, and messaging about items across CUNY campuses. This
          Privacy Policy explains what information we collect, how we use it,
          and how we protect it when you use the platform.
        </p>

        <div className="pp-section">
          <SectionTitle num={1}>Information We Collect</SectionTitle>

          <p className="pp-sub" style={subStyle}>
            Account and Profile Information
          </p>
          <p className="pp-p" style={pStyle}>
            When you create or edit an account, we may collect:
          </p>
          <BulletList
            items={[
              "Your CUNY email address",
              "Username, full name, campus, major, year/grade, and profile photo if you choose to add them",
              "Password credentials handled by Supabase authentication; we do not store your plain text password",
            ]}
          />

          <p className="pp-sub" style={subStyle}>
            Marketplace Listings
          </p>
          <p className="pp-p" style={pStyle}>
            When you create a listing, we store the details you provide,
            including title, description, price, category, department, course,
            condition, campus pickup location, images, status, and optional map
            address or coordinates.
          </p>

          <p className="pp-sub" style={subStyle}>
            Messages and Purchase Requests
          </p>
          <p className="pp-p" style={pStyle}>
            When buyers and sellers communicate, we store conversations,
            messages, purchase requests, request status, and related listing
            information so the inbox and marketplace flow work correctly.
          </p>

          <p className="pp-sub" style={subStyle}>
            Saved Items, Cart, and Reviews
          </p>
          <p className="pp-p" style={pStyle}>
            We store saved marketplace items, reviews you write, ratings you
            give, and profile/review data needed to show public seller
            reputation. Cart data may be stored in your browser session while
            you use the app.
          </p>

          <p className="pp-sub" style={subStyle}>
            Search and AI Search Data
          </p>
          <p className="pp-p" style={pStyle}>
            When you search, filter, or use AI Search, we process the search
            terms, categories, campus choices, filters, and prompts you enter.
            Search results may be cached to improve performance and reduce
            repeated API requests.
          </p>

          <p className="pp-sub" style={subStyle}>
            Safety Tools
          </p>
          <p className="pp-p" style={pStyle}>
            If you report or block a user, we store the information needed to
            apply that action, review safety issues, and reduce abuse.
          </p>
        </div>

        <hr style={dividerStyle} />

        <div className="pp-section">
          <SectionTitle num={2}>How We Use Your Information</SectionTitle>
          <p className="pp-p" style={pStyle}>
            We use the information we collect to:
          </p>
          <BulletList
            items={[
              "Provide and operate CUNY ReMarket",
              "Authenticate accounts and keep them secure",
              "Display listings, profiles, saved items, messages, purchase requests, reviews, and marketplace status",
              "Power marketplace search, AI-assisted search, and listing discovery",
              "Help prevent spam, abuse, unsafe behavior, and duplicate or fraudulent activity",
              "Maintain, debug, and improve the platform",
            ]}
          />
        </div>

        <hr style={dividerStyle} />

        <div className="pp-section">
          <SectionTitle num={3}>How We Store Your Data</SectionTitle>
          <p className="pp-p" style={pStyle}>
            User data is stored using Supabase, a managed cloud database and
            authentication platform. Passwords are handled securely by
            Supabase. CUNY ReMarket does not currently process payments or
            store payment card information. Some cart data may be stored in
            your browser session.
          </p>
        </div>

        <hr style={dividerStyle} />

        <div className="pp-section">
          <SectionTitle num={4}>Third-Party Services</SectionTitle>
          <p className="pp-p" style={pStyle}>
            We use third-party services to operate parts of CUNY ReMarket:
          </p>
          <BulletList
            items={[
              "Supabase for database storage, user authentication, account confirmation, and password reset",
              "SerpApi for external product/search data when those search features are used",
              "Google Gemini for AI-assisted marketplace search prompts",
              "Geocodio for converting listing pickup addresses into map coordinates when map lookup is used",
              "Email delivery services for account verification and marketplace verification messages",
            ]}
          />
          <p className="pp-p" style={pStyle}>
            We do not sell your personal data and we do not use your data for
            advertising.
          </p>
        </div>

        <hr style={dividerStyle} />

        <div className="pp-section">
          <SectionTitle num={5}>Data Retention</SectionTitle>
          <p className="pp-p" style={pStyle}>
            We keep your data for as long as your account is active or as long
            as needed to operate the marketplace, keep records of listings and
            messages, and maintain safety features. If you would like your data
            deleted, contact us at the email address below.
          </p>
        </div>

        <hr style={dividerStyle} />

        <div className="pp-section">
          <SectionTitle num={6}>Children's Privacy</SectionTitle>
          <p className="pp-p" style={pStyle}>
            CUNY ReMarket is not directed at children under the age of 13. We do
            not knowingly collect personal information from anyone under 13. If
            you believe a child has provided us with information, please contact
            us and we will delete it.
          </p>
        </div>

        <hr style={dividerStyle} />

        <div className="pp-section">
          <SectionTitle num={7}>Your Rights</SectionTitle>
          <p className="pp-p" style={pStyle}>
            You may request to:
          </p>
          <BulletList
            items={[
              "Access the personal data we hold about you",
              "Correct inaccurate profile or account data",
              "Delete your account and associated data where possible",
            ]}
          />
          <p className="pp-p" style={pStyle}>
            To exercise these rights, contact us using the information below.
          </p>
        </div>

        <hr style={dividerStyle} />

        <div className="pp-section">
          <SectionTitle num={8}>Changes to This Policy</SectionTitle>
          <p className="pp-p" style={pStyle}>
            We may update this Privacy Policy from time to time. If we make
            significant changes, we will update the effective date at the top of
            this page. Continued use of CUNY ReMarket after changes means you
            accept the updated policy.
          </p>
        </div>

        <hr style={dividerStyle} />

        <div className="pp-section">
          <SectionTitle num={9}>Contact Us</SectionTitle>
          <p className="pp-p" style={pStyle}>
            If you have questions or concerns about this Privacy Policy or your
            data, contact us at:
          </p>
          <div
            className="pp-contact"
            style={{
              background: isDark ? "rgba(255,255,255,0.04)" : "#f7f5f0",
            }}
          >
            <p className="pp-contact-name" style={titleStyle}>
              CUNY ReMarket
            </p>
            <p className="pp-p" style={{ ...pStyle, marginBottom: 4 }}>
              New York City, New York, United States
            </p>
            <p className="pp-p" style={{ ...pStyle, marginBottom: 0 }}>
              Email:{" "}
              <a href="mailto:bilal.bennour32@login.cuny.edu" style={titleStyle}>
                bilal.bennour32@login.cuny.edu
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
