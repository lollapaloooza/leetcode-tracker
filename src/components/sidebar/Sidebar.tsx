import { BackupSection } from './BackupSection'
import { FocusSection } from './FocusSection'
import { InterviewSection } from './InterviewSection'
import { ProgressSection } from './ProgressSection'
import { RoutineSection } from './RoutineSection'
import { ThisWeekSection } from './ThisWeekSection'

/** Secondary info, GitHub "About"-style: plain sections on the page background, so the task list stays the focus. */
export function Sidebar({ today }: { today: string }) {
  return (
    <div className="flex flex-col max-lg:border-t max-lg:pt-6 sm:max-lg:grid sm:max-lg:grid-cols-2 sm:max-lg:gap-x-10">
      <ProgressSection today={today} />
      <FocusSection today={today} />
      <InterviewSection today={today} />
      <ThisWeekSection today={today} />
      <RoutineSection />
      <BackupSection />
    </div>
  )
}
