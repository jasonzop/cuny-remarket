import { motion } from "framer-motion";
import GreetUser from "../../SharedComponents/GreetUser";
import type { CunyTheme } from "../../../lib/cunyThemes";

interface SearchHeadingProps {
  visible: boolean;
  theme: CunyTheme;
  campusShortName: string;
}

export default function SearchHeading({
  visible,
  theme,
  campusShortName,
}: SearchHeadingProps) {
  return (
    <div
      className="flex flex-col"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
    >
      <div className="-ml-3 self-start">
        <GreetUser visible={visible} />
      </div>

      <motion.h1
        className="mt-5 max-w-md text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-6xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        Buy, sell
        <br />
        and swap
        <br />
        <span style={{ color: theme.accent }}>within {campusShortName}.</span>
      </motion.h1>

      <p className="mt-5 max-w-sm text-sm font-semibold leading-6 text-white/82">
        A campus-only marketplace for CUNY students. No bots. No randoms. Just
        classmates and cleaner listings.
      </p>
    </div>
  );
}
