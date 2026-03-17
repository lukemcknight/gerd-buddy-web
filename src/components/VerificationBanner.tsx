import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

const VerificationBanner = () => {
  const { user, sendVerification } = useAuth();
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified) return null;

  const handleResend = async () => {
    await sendVerification();
    setSent(true);
  };

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2 text-center text-sm">
      <span className="text-warning">
        Please verify your email to post in the forum.{" "}
      </span>
      {sent ? (
        <span className="font-medium text-green-700">Verification email sent!</span>
      ) : (
        <button onClick={handleResend} className="font-medium text-primary hover:underline">
          Resend verification email
        </button>
      )}
    </div>
  );
};

export default VerificationBanner;
