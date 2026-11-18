import { RoleTabs } from '@/components/role-tabs';
import { CalendarIcon, ChatIcon, KidsIcon, PersonIcon } from '@/components/tab-icons';
import { useAuth } from '@/lib/auth';
import { useUnreadChats } from '@/lib/chat';

export default function CoachLayout() {
  const { profile } = useAuth();
  const unread = useUnreadChats(profile?.id);
  return (
    <RoleTabs
      tabs={[
        { name: 'index', label: 'tab.classes', Icon: CalendarIcon },
        { name: 'kids', label: 'tab.kids', Icon: KidsIcon },
        { name: 'chat', label: 'tab.chat', Icon: ChatIcon, badge: unread },
        { name: 'private', label: 'tab.private', Icon: PersonIcon },
      ]}
    />
  );
}
