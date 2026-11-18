import { RoleTabs } from '@/components/role-tabs';
import { HomeIcon, InboxIcon, KidsIcon, PlusIcon } from '@/components/tab-icons';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/notifications';

export default function ParentLayout() {
  const { unread } = useNotifications();
  const { profile } = useAuth();
  const single = profile?.account_type === 'single';
  return (
    <RoleTabs
      tabs={[
        { name: 'index', label: 'tab.home', Icon: HomeIcon },
        { name: 'kids', label: single ? 'tab.me' : 'tab.family', Icon: KidsIcon },
        { name: 'register', label: 'tab.register', Icon: PlusIcon },
        { name: 'inbox', label: 'tab.inbox', Icon: InboxIcon, badge: unread },
      ]}
    />
  );
}
