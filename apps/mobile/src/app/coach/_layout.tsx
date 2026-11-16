import { RoleTabs } from '@/components/role-tabs';
import { CalendarIcon, ChatIcon, KidsIcon, PersonIcon } from '@/components/tab-icons';

export default function CoachLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', label: 'tab.classes', Icon: CalendarIcon },
        { name: 'kids', label: 'tab.kids', Icon: KidsIcon },
        { name: 'chat', label: 'tab.chat', Icon: ChatIcon },
        { name: 'private', label: 'tab.private', Icon: PersonIcon },
      ]}
    />
  );
}
