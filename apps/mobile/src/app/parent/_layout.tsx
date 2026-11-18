import { RoleTabs } from '@/components/role-tabs';
import { ChatIcon, HomeIcon, InboxIcon, KidsIcon, PlusIcon } from '@/components/tab-icons';
import { useAuth } from '@/lib/auth';
import { useUnreadChats } from '@/lib/chat';
import { useNotifications } from '@/lib/notifications';

export default function ParentLayout() {
  const { unread } = useNotifications();
  const { profile } = useAuth();
  const single = profile?.account_type === 'single';
  const unreadChats = useUnreadChats(profile?.id);
  return (
    <RoleTabs
      tabs={[
        { name: 'index', label: 'tab.home', Icon: HomeIcon },
        { name: 'kids', label: single ? 'tab.me' : 'tab.family', Icon: KidsIcon },
        { name: 'register', label: 'tab.register', Icon: PlusIcon },
        { name: 'chat', label: 'tab.chat', Icon: ChatIcon, badge: unreadChats },
        { name: 'inbox', label: 'tab.inbox', Icon: InboxIcon, badge: unread },
      ]}
    />
  );
}
