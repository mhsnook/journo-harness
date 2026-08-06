import type { ReactNode } from 'react'

import { cx } from '../lib/cx'
import { Button } from './Button'

export interface ChatMessageProps {
	from: 'me' | 'agent'
	children: ReactNode
	className?: string
}

/**
 * One turn. Yours is a bounded block; the agent's runs loose against the pane
 * so the sources and controls it returns can sit at full width underneath it.
 */
export function ChatMessage({ from, children, className }: ChatMessageProps) {
	if (from === 'me') {
		return (
			<div
				className={cx(
					'ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-hush px-3 py-2 text-[0.8125rem] leading-relaxed text-ink',
					className,
				)}
			>
				{children}
			</div>
		)
	}
	return (
		<div
			className={cx('max-w-[95%] text-[0.8125rem] leading-relaxed text-ink', className)}
		>
			{children}
		</div>
	)
}

export interface ChatComposerProps {
	placeholder?: string
	/** Extra controls to the left of send — the ledger toggle, attachments. */
	leading?: ReactNode
	className?: string
}

export function ChatComposer({
	placeholder = 'Ask, argue, or paste something in…',
	leading,
	className,
}: ChatComposerProps) {
	return (
		<div className={cx('mt-auto flex items-center gap-2 pt-1', className)}>
			{leading}
			<div className="flex h-9 flex-1 items-center rounded-md border border-edge bg-surface px-2.5 text-[0.8125rem] text-faint">
				{placeholder}
			</div>
			<Button size="sm">send</Button>
		</div>
	)
}

export interface ChatSuggestionsProps {
	children: ReactNode
	className?: string
}

/** The reply chips an agent turn can end with. */
export function ChatSuggestions({ children, className }: ChatSuggestionsProps) {
	return <div className={cx('flex flex-wrap gap-1.5', className)}>{children}</div>
}
