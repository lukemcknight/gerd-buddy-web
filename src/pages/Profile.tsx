import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import InitialAvatar from "@/components/InitialAvatar";

const Profile = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const displayName = user.displayName || "Anonymous";
  const memberSince = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-col items-center space-y-4">
        <InitialAvatar name={displayName} size="lg" />
        <h1 className="text-2xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <p className="text-xs text-muted-foreground">Member since {memberSince}</p>
      </div>

      <div className="mt-10 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Stats</h2>
          <div className="mt-2 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Posts: <span className="font-medium text-foreground">0</span>
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">My Posts</h2>
          <div className="mt-2 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              No posts yet. Join the discussion in the forum!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
