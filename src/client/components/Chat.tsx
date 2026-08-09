import {
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'

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
	/** Absent on the wireframe screens, which render a still frame. */
	onSend?: (text: string) => void
	/** Why the composer will not send, and null when it will. A Proposal nobody
	 * ruled on is the case worth wording — nothing expires it (§11). */
	blocked?: string | null
	/** A turn is in flight. The field stays open; send becomes stop. */
	busy?: boolean
	/** Cancels the turn. Send stays a send button without one. */
	onStop?: () => void
	className?: string
}

/**
 * How far the field grows before it scrolls inside itself, in lines. Eight lines
 * of this type is about 183px with the box's padding, and the Chat Panel on
 * `MidChatScreen` is 26rem — so a composer at full height takes about half the
 * Panel and leaves the writer the rest of the transcript to write against.
 */
const maxLines = 8

/**
 * Sets the field's height to the height of what is in it, up to `maxLines`.
 *
 * The `auto` is not decoration: `scrollHeight` reads back the height the field
 * already has whenever the field is taller than its text, so without the reset
 * a field that grew to six lines would never shrink to three again.
 */
function grow(field: HTMLTextAreaElement) {
	const lineHeight = Number.parseFloat(getComputedStyle(field).lineHeight)
	const ceiling = Number.isNaN(lineHeight) ? Infinity : lineHeight * maxLines

	field.style.height = 'auto'
	field.style.height = `${Math.min(field.scrollHeight, ceiling)}px`
}

/**
 * **The field is never disabled while a turn runs.** Disabling it blurs it, so a
 * thought typed while the guide answers is lost at the first keystroke. The
 * button beside it changes instead.
 *
 * The field is a `textarea` because writers compose paragraphs and paste
 * passages in. Enter sends and shift-Enter breaks the line, which is the pair
 * a chat composer is expected to have.
 */
export function ChatComposer({
	placeholder = 'Ask, argue, or paste something in…',
	leading,
	onSend,
	blocked = null,
	busy = false,
	onStop,
	className,
}: ChatComposerProps) {
	const [said, setSaid] = useState('')
	const field = useRef<HTMLTextAreaElement>(null)
	const stopping = busy && onStop !== undefined
	const cannotSend =
		blocked !== null || busy || onSend === undefined || said.trim() === ''

	// Resizing on the value rather than on the change event covers the two cases
	// a change handler misses: the first paint, and sending, which empties the
	// field without anyone typing in it.
	useLayoutEffect(() => {
		if (field.current !== null) grow(field.current)
	}, [said])

	const send = () => {
		if (cannotSend || onSend === undefined) return

		onSend(said)
		setSaid('')
	}

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key !== 'Enter' || event.shiftKey) return

		event.preventDefault()
		send()
	}

	return (
		<div
			// The browser story test finds the composer by this attribute rather than
			// by a class, so renaming a Tailwind class cannot quietly empty the test.
			data-composer=""
			className={cx('mt-auto flex flex-col gap-1.5 pt-1', className)}
		>
			{blocked === null ? null : <Notice>{blocked}</Notice>}
			<div className="flex items-end gap-2">
				{leading}
				<div className="flex flex-1 items-center rounded-md border border-edge bg-surface px-2.5 py-1.5">
					<textarea
						ref={field}
						aria-label="Message the guide"
						className="min-w-0 flex-1 resize-none overflow-y-auto bg-transparent text-[0.8125rem] leading-relaxed text-ink outline-none placeholder:text-faint"
						disabled={onSend === undefined}
						onChange={(event) => setSaid(event.target.value)}
						onKeyDown={onKeyDown}
						placeholder={placeholder}
						rows={1}
						value={said}
					/>
				</div>
				{stopping ? (
					<Button onClick={onStop} size="sm">
						stop
					</Button>
				) : (
					<Button disabled={cannotSend} onClick={send} size="sm">
						send
					</Button>
				)}
			</div>
		</div>
	)
}

export interface ChatWorkingProps {
	children: ReactNode
	className?: string
}

/** What the guide is doing. A model can take most of a minute, and a line that
 * never changes reads as a hang, so this counts the seconds it has been up. */
export function ChatWorking({ children, className }: ChatWorkingProps) {
	const [seconds, setSeconds] = useState(0)

	useEffect(() => {
		const tick = setInterval(() => setSeconds((held) => held + 1), 1000)

		return () => clearInterval(tick)
	}, [])

	return (
		<p className={cx('flex items-center gap-1.5 text-[0.6875rem] text-faint', className)}>
			<span aria-hidden className="size-1.5 animate-pulse rounded-full bg-faint" />
			{children}
			{seconds > 0 ? <span className="font-mono">{seconds}s</span> : null}
		</p>
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
