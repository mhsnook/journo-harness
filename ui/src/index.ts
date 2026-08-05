// Primitives
export { Annotation } from './components/Annotation'
export { ArticleBar } from './components/ArticleBar'
export { ArticleCard } from './components/ArticleCard'
export { Button } from './components/Button'
export { ChatComposer, ChatMessage, ChatSuggestions } from './components/Chat'
export { Check } from './components/Check'
export { Chip } from './components/Chip'
export { CoachNote, NoteDot } from './components/CoachNote'
export { Divider, SectionHeading } from './components/Divider'
export { DraftSurface } from './components/DraftSurface'
export { ExampleBlock, PolarityHeading } from './components/ExampleBlock'
export { EmptySlot, Field } from './components/Field'
export { Frame, FrameBody } from './components/Frame'
export { LengthBar } from './components/LengthBar'
export { ListRow } from './components/ListRow'
export { MetaLabel } from './components/MetaLabel'
export { Pane, PaneHeader } from './components/Pane'
export { PANES, PaneRail } from './components/PaneRail'
export { ProgressBar } from './components/ProgressBar'
export { QuoteRow } from './components/QuoteRow'
export { SourceCard } from './components/SourceCard'
export { TitleBar } from './components/TitleBar'
export type { PaneId } from './components/PaneRail'

// Composed article pieces
export {
  PlanBlock,
  PlanLength,
  PlanOutline,
  PlanQuotes,
  PlanReferences,
} from './screens/article/PlanBlocks'
export { PlanRail } from './screens/article/PlanRail'
export {
  RuleBlock,
  ScoreTest,
  SettingsDetailHeader,
  SettingsShell,
} from './screens/global/SettingsShell'

// Screens — 1 global
export { BoardScreen } from './screens/global/BoardScreen'
export { DeskScreen } from './screens/global/DeskScreen'
export { TableScreen } from './screens/global/TableScreen'
export { VoicesScreen } from './screens/global/VoicesScreen'
export { AdjectivesScreen } from './screens/global/AdjectivesScreen'
export { FavouriteSourcesScreen } from './screens/global/FavouriteSourcesScreen'

// Screens — 2 plan an article
export { BlankPlanScreen } from './screens/article/BlankPlanScreen'
export { MidConversationScreen } from './screens/article/MidConversationScreen'
export { ReadyToDraftScreen } from './screens/article/ReadyToDraftScreen'
export { ChatWithSourcesScreen } from './screens/article/ChatWithSourcesScreen'
export { PlanSheetScreen } from './screens/article/PlanSheetScreen'
export { LedgerDrawerScreen } from './screens/article/LedgerDrawerScreen'
export { LedgerPopoverScreen } from './screens/article/LedgerPopoverScreen'

// Screens — 3 drafting
export { PlanAndDraftScreen } from './screens/article/PlanAndDraftScreen'
export { DraftOnlyScreen } from './screens/article/DraftOnlyScreen'
export { ChatAndDraftScreen } from './screens/article/ChatAndDraftScreen'
export { MarginNotesScreen } from './screens/article/MarginNotesScreen'
export { NotesRailScreen } from './screens/article/NotesRailScreen'

// Screens — 4 reviews
export { FullReviewScreen } from './screens/review/FullReviewScreen'
export { ReviewRailScreen } from './screens/review/ReviewRailScreen'
export { NotesToChatScreen } from './screens/review/NotesToChatScreen'
export { PhoneNotesScreen } from './screens/review/PhoneNotesScreen'
export { PaneCombosScreen } from './screens/review/PaneCombosScreen'
export { LayersRecapScreen } from './screens/review/LayersRecapScreen'

// Screens — 5 & 6 finish, archive
export { FinishScreen } from './screens/finish/FinishScreen'
export { ArchiveScreen } from './screens/finish/ArchiveScreen'
export { ShowcaseScreen } from './screens/finish/ShowcaseScreen'

export type { Article, OutlineSection, Quote, Source } from './mock/content'
