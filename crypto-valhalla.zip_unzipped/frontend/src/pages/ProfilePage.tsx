import { useUserGuardContext } from "app";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { user } = useUserGuardContext();

  if (!user) {
    // This should ideally not happen in a protected page with UserGuard
    return <p>Loading user information or not logged in...</p>;
  }

  return (
    <div className="p-4 md:p-8 flex justify-center items-start min-h-screen bg-gray-900 text-gray-100">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700 shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-sky-400">User Profile</CardTitle>
          <CardDescription className="text-center text-gray-400">
            Valhalla awaits, warrior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="text-lg text-gray-200 break-all">{user.email || "No email provided"}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">User ID</h3>
            <p className="text-lg text-gray-200 break-all">{user.uid}</p>
          </div>
          {user.displayName && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Display Name</h3>
              <p className="text-lg text-gray-200">{user.displayName}</p>
            </div>
          )}
          {user.photoURL && (
            <div className="flex justify-center">
              <img src={user.photoURL} alt="User avatar" className="w-24 h-24 rounded-full border-2 border-sky-500" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}