import { useEffect, useState } from "react";
import { supabase } from "../../supabase-client";
import { Link } from "react-router-dom";

const teamMembers = [
  {
    name: "Jason Parmar",
    role: "Frontend & Authentication",
    description:
      "Implemented CUNY login, profile setup, listing flows, and key frontend components for a smooth student marketplace experience.",
    color: "#3B82F6",
    icon: "⚛",
  },
  {
    name: "Kevin Tan",
    role: "Search & Marketplace",
    description:
      "Worked on marketplace browsing, search functionality, item discovery, and filtering to help students find listings faster.",
    color: "#8B5CF6",
    icon: "⌕",
  },
  {
    name: "Bilal Bennour",
    role: "Backend & Database",
    description:
      "Built backend logic, managed Supabase integration, structured database tables, and connected frontend features to stored data.",
    color: "#06B6D4",
    icon: "⬡",
  },
  {
    name: "Sammi Mushtaq",
    role: "UI/UX Design",
    description:
      "Designed clean user interface sections, improved page layouts, and helped make the platform simple and easy to use.",
    color: "#10B981",
    icon: "✦",
  },
  {
    name: "Omar Saleh",
    role: "Testing & Integration",
    description:
      "Tested user flows, checked feature behavior, helped debug issues, and supported final integration across the application.",
    color: "#F59E0B",
    icon: "✓",
  },
];

const features = [
  "Verified CUNY Login",
  "Marketplace Listings",
  "Course Categories",
  "Custom Categories",
  "Search & Filters",
  "Student Profiles",
];

const stats = [
  { value: "6+", label: "Core Features" },
  { value: "5", label: "Team Members" },
  { value: "1", label: "Student Platform" },
];

function WhatIsCunyReMarket() {
  const [username, setUsername] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const name = data.session?.user?.user_metadata?.username ?? null;
      setUsername(name);
    });

    setTimeout(() => setVisible(true), 50);
  }, []);

  return (
    <div
      className="wiv-page min-h-screen flex flex-col text-gray-900 overflow-x-hidden"
      style={{ background: "#f0f4ff" }}
    >
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            left: "-5%",
            width: "55vw",
            height: "55vw",
            maxWidth: 700,
            maxHeight: 700,
            background:
              "radial-gradient(circle, rgba(0,170,255,0.18) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "30%",
            right: "-10%",
            width: "50vw",
            height: "50vw",
            maxWidth: 650,
            maxHeight: 650,
            background:
              "radial-gradient(circle, rgba(107,48,255,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(50px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            left: "20%",
            width: "40vw",
            height: "40vw",
            maxWidth: 500,
            maxHeight: 500,
            background:
              "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div
        className="wiv-sticky-header sticky top-0 z-30 px-6 py-4 flex justify-center items-center backdrop-blur-xl border-b"
        style={{
          background: "rgba(240,244,255,0.7)",
          borderColor: "rgba(0,170,255,0.15)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <svg width="26" height="26" viewBox="0 0 52 52" fill="none">
            <defs>
              <linearGradient id="wiv-lg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00AAFF" />
                <stop offset="100%" stopColor="#6B30FF" />
              </linearGradient>
            </defs>
            <circle
              cx="26"
              cy="26"
              r="18"
              fill="rgba(0,170,255,0.1)"
              stroke="url(#wiv-lg)"
              strokeWidth="2.4"
            />
            <path
              d="M17 29L24 36L37 18"
              fill="none"
              stroke="url(#wiv-lg)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <span
            className="text-xl font-extrabold tracking-tight"
            style={{
              background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            CUNY ReMarket
          </span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-14">
        {username && (
          <div
            className="greet-user-pill mb-5 px-4 py-1.5 rounded-full text-sm backdrop-blur-md border"
            style={{
              background: "rgba(255,255,255,0.55)",
              borderColor: "rgba(0,170,255,0.2)",
            }}
          >
            Welcome back,{" "}
            <span
              className="font-semibold"
              style={{
                background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {username}
            </span>{" "}
            👋
          </div>
        )}

        <div
          className="mb-3 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            background: "rgba(0,170,255,0.1)",
            color: "#0088DD",
            border: "1px solid rgba(0,170,255,0.2)",
          }}
        >
          The student marketplace for CUNY
        </div>

        <h2
          className="wiv-title text-5xl font-black mb-5 leading-tight"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
            background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          About CUNY ReMarket?
        </h2>

        <p
          className="wiv-copy text-gray-500 text-base leading-relaxed max-w-xl mb-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
          }}
        >
          CUNY ReMarket is a student marketplace platform designed specifically
          for CUNY students. Students can securely sign in using verified CUNY
          accounts, create listings, browse products, search by categories and
          courses, and connect with other students for buying and selling
          campus-related items.
        </p>

        <div
          className="flex gap-4 flex-wrap justify-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s",
          }}
        >
          {stats.map(({ value, label }) => (
            <div
              key={label}
              className="wiv-stat-card flex flex-col items-center px-8 py-4 rounded-2xl backdrop-blur-md"
              style={{
                background: "rgba(255,255,255,0.55)",
                border: "1px solid rgba(255,255,255,0.7)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              <span
                className="text-3xl font-black"
                style={{
                  background: "linear-gradient(90deg,#00AAFF,#6B30FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {value}
              </span>
              <span className="text-xs text-gray-400 uppercase tracking-widest mt-1 font-medium">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center px-6 pb-16">
        <div
          className="mb-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            background: "rgba(107,48,255,0.08)",
            color: "#6B30FF",
            border: "1px solid rgba(107,48,255,0.15)",
          }}
        >
          The Team
        </div>

        <h2
          className="text-2xl font-black text-gray-900 mb-10 mt-1"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.6s ease 0.3s",
          }}
        >
          Built by five, designed for CUNY students
        </h2>

        <div className="wiv-team-grid flex flex-wrap justify-center gap-5">
          {teamMembers.map((member, i) => {
            const initials = member.name
              .split(" ")
              .map((n) => n[0])
              .join("");

            return (
              <div
                key={member.name}
                className="wiv-team-card group relative flex flex-col w-52 rounded-2xl p-5 cursor-default transition-all duration-300 hover:-translate-y-2"
                style={{
                  background: "rgba(255,255,255,0.55)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.75)",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(24px)",
                  transition: `opacity 0.5s ease ${
                    0.35 + i * 0.08
                  }s, transform 0.5s ease ${
                    0.35 + i * 0.08
                  }s, box-shadow 0.3s ease, translate 0.3s ease`,
                }}
              >
                <div
                  className="absolute top-0 left-4 right-4 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(90deg, ${member.color}, ${member.color}50)`,
                  }}
                />

                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-base font-black mx-auto mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${member.color}20, ${member.color}08)`,
                    border: `1.5px solid ${member.color}35`,
                    color: member.color,
                    boxShadow: `0 4px 16px ${member.color}20`,
                  }}
                >
                  {initials}
                </div>

                <h3 className="text-sm font-bold text-gray-900 text-center mb-1">
                  {member.name}
                </h3>

                <span
                  className="mx-auto px-3 py-0.5 rounded-full text-xs font-semibold tracking-wide mb-3"
                  style={{
                    background: `${member.color}12`,
                    color: member.color,
                    border: `1px solid ${member.color}20`,
                  }}
                >
                  {member.icon} {member.role}
                </span>

                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  {member.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="wiv-mission relative z-10 mx-4 mb-8 rounded-3xl p-8 flex flex-col items-center text-center"
        style={{
          background: "rgba(255,255,255,0.50)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="mb-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            background: "rgba(0,170,255,0.08)",
            color: "#0088DD",
            border: "1px solid rgba(0,170,255,0.15)",
          }}
        >
          Our Mission
        </div>

        <h3 className="text-2xl font-black text-gray-900 mb-3 mt-1">
          Why CUNY ReMarket?
        </h3>

        <p className="text-gray-500 text-sm leading-relaxed max-w-xl mb-6">
          CUNY ReMarket makes it easier for students to buy and sell useful
          items within the CUNY community. Instead of relying on random public
          marketplaces, students can use a school-focused platform with verified
          login, organized categories, course-related listings, and searchable
          products.
        </p>

        <div className="flex flex-wrap gap-2 justify-center">
          {features.map((feat, i) => (
            <span
              key={feat}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 cursor-default"
              style={{
                background: `rgba(${
                  i % 2 === 0 ? "0,170,255" : "107,48,255"
                },0.08)`,
                border: `1px solid rgba(${
                  i % 2 === 0 ? "0,170,255" : "107,48,255"
                },0.2)`,
                color: i % 2 === 0 ? "#0088DD" : "#6B30FF",
              }}
            >
              {feat}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-4 mb-8">
        <div className="text-center mb-5">
          <div
            className="inline-block mb-2 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{
              background: "rgba(88,101,242,0.08)",
              color: "#5865F2",
              border: "1px solid rgba(88,101,242,0.15)",
            }}
          >
            Community
          </div>

          <h3 className="text-xl font-black text-gray-900">Stay connected</h3>

          <p className="text-sm text-gray-400 mt-1">
            Join the CUNY ReMarket community and connect with fellow students
          </p>
        </div>
      </div>

      <div
        className="relative z-10 w-full py-10 mt-auto flex justify-center items-center gap-4"
        style={{ borderTop: "1px solid rgba(0,170,255,0.1)" }}
      >
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} CUNY ReMarket. All rights reserved.
        </p>
        <p className="text-gray-400">•</p>
        <Link to="/privacy-policy" className="text-xs text-gray-400">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}

export default WhatIsCunyReMarket;