import { useUser } from "../../Contexts/UserContext";

interface GreetUserProps {
  visible: boolean;
}

export default function GreetUser({ visible }: GreetUserProps) {
  const { username } = useUser();

  return (
    <>
      {username && (
        <div
          className="relative z-10 mt-5 flex justify-center"
          style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s ease" }}
        >
          <div
            className="greet-user-pill border px-4 py-1.5 text-sm font-semibold backdrop-blur-md"
            style={{
              background: "rgba(255,250,240,0.82)",
              borderColor: "rgba(22,18,13,0.22)",
            }}
          >
            Welcome back,{" "}
            <span
              className="font-black"
              style={{
                background: "linear-gradient(90deg,#1f3d6d,#5f2d90)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {username}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
