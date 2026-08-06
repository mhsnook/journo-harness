import { Chip } from '../../components/Chip'
import { CoachNote } from '../../components/CoachNote'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { draftShort } from '../../mock/content'

/**
 * 4(d) — The phone. A form factor, not a phase: read the draft, triage the
 * notes, and nothing else. No writing happens here.
 */
export function PhoneNotesScreen() {
  return (
    <Frame width={280}>
      <div className="flex items-baseline justify-between px-3.5 py-2.5">
        <span className="text-[0.8125rem] text-faint">The Long Tail of Batteries</span>
        <span className="text-[0.6875rem] text-faint">draft 1</span>
      </div>
      <FrameBody className="gap-3.5 px-3.5 pb-4">
        <div className="flex gap-1.5">
          <Chip tone="solid" interactive>
            notes 3
          </Chip>
          <Chip tone="outline" interactive>
            read
          </Chip>
          <Chip tone="outline" interactive>
            plan
          </Chip>
        </div>

        <CoachNote
          anchor="§3"
          confidence="confident"
          live
          title="You're restating §2"
          body="§3 is meant to move to the cost of the delay."
          actions={
            <>
              <Chip tone="outline" interactive>
                accept
              </Chip>
              <Chip tone="muted" interactive>
                later
              </Chip>
            </>
          }
        />
        <CoachNote
          anchor="whole piece"
          confidence="tentative"
          title="220 words over target"
        />

        <div className="flex flex-col gap-1.5">
          <MetaLabel>Read</MetaLabel>
          <div className="prose-draft">
            {draftShort.map((paragraph, i) => (
              <p key={i} className={i > 0 ? 'mt-3 text-[0.8125rem]' : 'text-[0.8125rem]'}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </FrameBody>
    </Frame>
  )
}
