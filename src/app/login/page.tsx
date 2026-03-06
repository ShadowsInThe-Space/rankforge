import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold tracking-tight">
            Rank<span className="text-primary">Forge</span>
          </a>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don't have an account?{" "}
          <a href="/register" className="text-primary hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
