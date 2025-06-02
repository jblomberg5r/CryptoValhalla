import { SignInOrUpForm } from "app"

export default function Login() {
  return (
    <div className="p-4">
      <h1>Welcome to CryptoValhalla</h1>
      <SignInOrUpForm signInOptions={{ google: true, emailAndPassword: true }} />
    </div>
  );
};