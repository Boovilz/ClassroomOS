export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-royal-blue-50 via-background to-emerald-green-50 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
