import { RoleTabs } from '@/components/role-tabs';
import { HomeIcon, InboxIcon, KidsIcon, PlusIcon } from '@/components/tab-icons';

export default function ParentLayout() {
  return (
    <RoleTabs
      tabs={[
        { name: 'index', label: 'tab.home', Icon: HomeIcon },
        { name: 'kids', label: 'tab.kids', Icon: KidsIcon },
        { name: 'register', label: 'tab.register', Icon: PlusIcon },
        { name: 'inbox', label: 'tab.inbox', Icon: InboxIcon },
      ]}
    />
  );
}
