import GreetUser from "../../SharedComponents/GreetUser";
import { motion } from "framer-motion";

interface SearchHeadingProps {
  visible: boolean;
}

export default function SearchHeading({
  visible,
}: SearchHeadingProps) {
  return (
    <div
      className="flex flex-col items-center text-center mb-8"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      <GreetUser visible={visible} />

<motion.h1
  className="search-title text-5xl font-black mb-2 leading-tight"
  initial={{ opacity: 0 }}
  animate={{ opacity: visible ? 1 : 0 }}
  transition={{ duration: 0.7, ease: "easeOut" }}
  style={{
    color: "#60a5fa",
    textShadow: "0 0 25px rgba(59,130,246,.45)",
  }}
>
  Discover For You
</motion.h1>

      <p className="search-subtitle text-gray-400 text-sm font-medium max-w-md">
        Personalized recommendations, campus listings, and student essentials across CUNY
      </p>

    </div>
  );
}