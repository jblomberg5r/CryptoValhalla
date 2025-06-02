import React from "react";
import { SignInOrUpForm } from "app/auth"; // Corrected import path
import { Navigate, useSearchParams } from "react-router-dom";
import { useCurrentUser } from "app";

const SignupPage = () => {
  const { user, loading } = useCurrentUser();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/"; // Default redirect to home

  if (loading) {
    // You might want a more sophisticated loading indicator
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (user) {
    // If user is already logged in, redirect them
    return <Navigate to={next} replace />;
  }

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-card p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-8">
          Create Account
        </h1>
        <SignInOrUpForm mode="sign-up" redirectTo={next} />
      </div>
    </div>
  );
};

export default SignupPage;