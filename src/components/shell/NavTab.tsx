import { TabsTrigger } from '@/components/ui/tabs'
import type { NavTabInfo } from './nav-tabs'

const iconClass = 'text-muted-foreground group-data-[state=active]/nav:text-foreground'

/** GitHub UnderlineNav: muted icon, label, counter — coral underline on the active tab, over the header's border. */
export function NavTab({ tab, count }: { tab: NavTabInfo; count?: number }) {
  const { value, label, icon: Icon, narrow } = tab
  return (
    <TabsTrigger value={value} className="group/nav h-full flex-none px-0 after:bg-nav-active group-data-horizontal/tabs:after:-bottom-px">
      {narrow ? (
        <>
          <narrow.icon className={`${iconClass} lg:hidden`} />
          <Icon className={`${iconClass} max-lg:hidden`} />
          <span className="lg:hidden">{narrow.label}</span>
          <span className="max-lg:hidden">{label}</span>
        </>
      ) : (
        <>
          <Icon className={iconClass} />
          {label}
        </>
      )}
      {count !== undefined && count > 0 && (
        <>
          {/* Not drawn (the gap spaces them), but keeps the name "Today 4" rather than "Today4". */}{' '}
          <span className="min-w-[18px] rounded-full bg-muted px-1.5 text-[11px] leading-[18px] text-muted-foreground tabular-nums">
            {count}
          </span>
        </>
      )}
    </TabsTrigger>
  )
}
