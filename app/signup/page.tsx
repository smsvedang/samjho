import AuthForm from "@/app/auth/AuthForm";

export const metadata = {
  title: "Create account | Samjho",
  description: "Create your Samjho learning space.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
