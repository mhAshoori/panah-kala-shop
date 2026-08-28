import { auth } from '@/auth';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SignOutUser } from '@/lib/actions/user.actions';

const UserButton = async () => {
  const session = await auth();
  const locale = await getLocale();
  const t = await getTranslations('header');
  const tAdmin = await getTranslations('admin');
  const dir = locale === 'fa' ? 'rtl' : 'ltr';

  if (!session)
    return (
      <Button asChild>
        <Link href='/sign-in'>{t('signIn')}</Link>
      </Button>
    );

  const firstInitial = session.user?.name?.charAt(0).toUpperCase() ?? 'U';

  return (
    <div className='flex gap-2 items-center'>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className='flex items-center'>
            <Button
              variant='ghost'
              className='relative w-8 h-8 rounded-full ms-2 flex items-center justify-center bg-muted text-sm font-medium'
            >
              {firstInitial}
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className='w-56 text-right'
          align='end'
          forceMount
          style={{ direction: dir }}
        >
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium leading-none'>
                {session.user?.name}
              </p>
              <p className='text-xs leading-none text-muted-foreground'>
                {session.user?.email}
              </p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuItem asChild>
            <Link href="/user/profile" className="w-full">
              {t('myAccount')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/user/orders" className="w-full">
              {t('myOrders')}
            </Link>
          </DropdownMenuItem>
          {session.user?.role === 'admin' && (
            <DropdownMenuItem asChild>
              <Link href="/admin" className="w-full">
                {tAdmin('dashboard')}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className='p-0 mb-1'>
            <form action={SignOutUser} className='w-full'>
              <Button
                className='w-full py-4 px-2 h-4 justify-start'
                variant='ghost'
              >
                {t('signOut')}
              </Button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserButton;