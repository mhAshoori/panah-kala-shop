export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className='flex-center min-h-screen w-full py-10'>{children}</div>;
}
