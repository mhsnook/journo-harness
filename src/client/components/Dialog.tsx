import { type ReactNode, useEffect, useRef } from 'react'

import { cx } from '../lib/cx'

export interface DialogProps {
	open: boolean
	/** Escape, the backdrop, and anything the caller wires to it. */
	onClose: () => void
	title: string
	/** Under the title, quiet. */
	subtitle?: ReactNode
	children?: ReactNode
	/** The row of buttons at the foot. */
	actions?: ReactNode
	className?: string
}

/**
 * A small panel over the whole window, on the browser's own `<dialog>`. Native
 * rather than a `position: fixed` div, because `showModal` is what gives the
 * focus trap, the inert page behind it, and Escape — three things a hand-rolled
 * overlay has to reimplement and usually gets wrong.
 */
export function Dialog({
	open,
	onClose,
	title,
	subtitle,
	children,
	actions,
	className,
}: DialogProps) {
	const held = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = held.current
		if (dialog === null) return

		if (open && !dialog.open) dialog.showModal()
		if (!open && dialog.open) dialog.close()
	}, [open])

	return (
		<dialog
			className={cx(
				'm-auto w-[min(24rem,calc(100vw-2rem))] rounded-frame border border-edge bg-surface p-0 text-ink shadow-frame backdrop:bg-ink/25',
				className,
			)}
			// Escape fires `cancel`; a `close` from anywhere else fires this too, so
			// the caller's state cannot drift from what is on screen.
			onClose={onClose}
			onClick={(event) => {
				// A click that lands on the dialog element itself landed on the
				// backdrop: everything inside sits in the form below.
				if (event.target === held.current) onClose()
			}}
			ref={held}
		>
			<div className="flex flex-col gap-3.5 p-4">
				<div className="flex flex-col gap-1">
					<h2 className="text-[0.9375rem] leading-tight font-medium text-ink">{title}</h2>
					{subtitle ? (
						<p className="text-[0.75rem] leading-relaxed text-faint">{subtitle}</p>
					) : null}
				</div>
				{children}
				{actions ? <div className="flex justify-end gap-2">{actions}</div> : null}
			</div>
		</dialog>
	)
}
