import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold tracking-tight">
            Rank<span className="text-primary">Forge</span>
          </a>
          <p className="text-muted-foreground mt-2">Create your account</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
