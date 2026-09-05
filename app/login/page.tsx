import AuthForm from "@/app/auth/AuthForm";

export const metadata = {
  title: "Sign in | Samjho",
  description: "Sign in to continue learning with Samjho.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
