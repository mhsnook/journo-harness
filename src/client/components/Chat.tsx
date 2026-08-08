import { type KeyboardEvent, type ReactNode, useState } from 'react'

import { cx } from '../lib/cx'
import { Button } from './Button'
import { Notice } from './Notice'

export interface ChatMessageProps {
	from: 'me' | 'guide'
	children: ReactNode
	className?: string
}

/**
 * One turn. Yours is a bounded block; the guide's runs loose against the Panel
 * so the references and controls it returns can sit at full width underneath it.
 */
export function ChatMessage({ from, children, className }: ChatMessageProps) {
	if (from === 'me') {
		return (
			<div
				className={cx(
					'ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-hush px-3 py-2 text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink',
					className,
				)}
			>
				{children}
			</div>
		)
	}
	return (
		<div
			className={cx(
				'max-w-[95%] text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink',
				className,
			)}
		>
			{children}
		</div>
	)
}

export interface ChatComposerProps {
	placeholder?: string
	/** Extra controls to the left of send — the ledger toggle, attachments. */
	leading?: ReactNode
	/** Sends what the writer typed. A screen with none renders a still frame. */
	onSend?: (text: string) => void
	/**
	 * Why the composer will not send, and null when it will. A parked tool batch
	 * is the case that matters: Cloudflare's batch-completeness rule has no
	 * orphan timeout, so a Proposal nobody ruled on stalls the turn — say it here
	 * rather than letting the composer sit dead (docs/architecture.md §11).
	 */
	blocked?: string | null
	/** Held while a turn is in flight, which needs no sentence to explain it. */
	disabled?: boolean
	className?: string
}

export function ChatComposer({
	placeholder = 'Ask, argue, or paste something in…',
	leading,
	onSend,
	blocked = null,
	disabled = false,
	className,
}: ChatComposerProps) {
	const [said, setSaid] = useState('')
	const stopped = blocked !== null || disabled || onSend === undefined

	const send = () => {
		if (stopped || onSend === undefined || said.trim() === '') return

		onSend(said)
		setSaid('')
	}

	const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || event.shiftKey) return

		event.preventDefault()
		send()
	}

	return (
		<div className={cx('mt-auto flex flex-col gap-1.5 pt-1', className)}>
			{blocked === null ? null : <Notice>{blocked}</Notice>}
			<div className="flex items-center gap-2">
				{leading}
				<div className="flex h-9 flex-1 items-center rounded-md border border-edge bg-surface px-2.5 text-[0.8125rem]">
					<input
						aria-label="Message the guide"
						className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint"
						disabled={stopped}
						onChange={(event) => setSaid(event.target.value)}
						onKeyDown={onKeyDown}
						placeholder={placeholder}
						type="text"
						value={said}
					/>
				</div>
				<Button size="sm" disabled={stopped || said.trim() === ''} onClick={send}>
					send
				</Button>
			</div>
		</div>
	)
}

export interface ChatRepliesProps {
	children: ReactNode
	className?: string
}

/** The reply chips a guide turn can end with. */
export function ChatReplies({ children, className }: ChatRepliesProps) {
	return <div className={cx('flex flex-wrap gap-1.5', className)}>{children}</div>
}

export interface ChatNoteProps {
	children: ReactNode
	className?: string
}

/** What the Chat did rather than what it said: a Proposal ruled on, a turn
 * looking something up. Quiet, because it is a record and not a turn. */
export function ChatNote({ children, className }: ChatNoteProps) {
	return <p className={cx('text-[0.6875rem] text-faint', className)}>{children}</p>
}
