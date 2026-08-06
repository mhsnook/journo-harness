import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { Frame, FrameBody } from '../../components/Frame'
import { MetaLabel } from '../../components/MetaLabel'
import { Pane } from '../../components/Pane'
import { TitleBar } from '../../components/TitleBar'
import { ARTICLE_TITLE } from '../../mock/content'

/**
 * 5(a) — Finish, not "export". The last steps might include a review, or
 * twenty-five candidate titles — this is the start of a checkout process, not
 * the end of the piece.
 */
export function FinishScreen() {
  return (
    <Frame width={560}>
      <TitleBar back={ARTICLE_TITLE} title="Finish" />
      <FrameBody>
        <Pane className="gap-4 p-4">
          <div className="flex items-center gap-2">
            <Chip tone="solid" interactive>
              markdown
            </Chip>
            <Chip tone="outline" interactive>
              html
            </Chip>
            <Chip tone="outline" interactive>
              docx
            </Chip>
            <span className="ml-1 text-[0.75rem] text-faint">footnotes included</span>
          </div>

          <section className="flex flex-col gap-2">
            <MetaLabel>House style — footnote template</MetaLabel>
            <div className="flex flex-col gap-2 rounded-md border border-edge bg-sunk p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Chip tone="default">author</Chip>
                <span className="text-[0.75rem] text-muted">,</span>
                <Chip tone="default">title</Chip>
                <span className="text-[0.75rem] text-muted">,</span>
                <Chip tone="default">publication</Chip>
                <span className="text-[0.75rem] text-muted">(</span>
                <Chip tone="default">date</Chip>
                <span className="text-[0.75rem] text-muted">),</span>
                <Chip tone="default">url</Chip>
              </div>
              <p className="text-[0.6875rem] text-faint">
                Drag the fields into order; type literal text between them.
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <MetaLabel>Preview</MetaLabel>
            <ol className="flex flex-col gap-1.5 text-[0.75rem] leading-relaxed text-muted">
              <li>
                1. R. Okonkwo, “Permit throughput in six mid-sized cities”, the Quarterly (2023),
                quarterly.example/permit-throughput
              </li>
              <li>
                2. A. Weill, “Zoning and the missing middle”, Field Notes (2019),
                fieldnotes.example/missing-middle
              </li>
            </ol>
          </section>

          <div className="flex flex-wrap gap-2">
            <Button>download</Button>
            <Button>copy</Button>
            <Button tone="accent">mark as sent →</Button>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-edge bg-sunk p-2.5">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <MetaLabel>Remind me to chase it</MetaLabel>
              <div className="flex flex-wrap gap-1.5">
                <Chip tone="outline" interactive>
                  3 days
                </Chip>
                <Chip tone="default" interactive>
                  1 week
                </Chip>
                <Chip tone="outline" interactive>
                  2 weeks
                </Chip>
                <Chip tone="outline" interactive>
                  a date…
                </Chip>
              </div>
            </div>
            <Button size="sm">set</Button>
          </div>
        </Pane>
      </FrameBody>
    </Frame>
  )
}
