import MainNav from './main-nav';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-6 py-4'>
      <MainNav />
      {children}
    </div>
  );
}
