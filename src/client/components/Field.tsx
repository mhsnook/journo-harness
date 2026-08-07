import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react'

import { cx } from '../lib/cx'

/** The frame both the read-only Field and the editable TextField sit in, so a
 * field the writer types in looks like the one they cannot. */
const frameClass =
	'flex flex-1 items-center gap-2 rounded-md border border-edge bg-surface px-2.5'

const sizeClass = {
	sm: 'h-7 text-[0.75rem]',
	md: 'h-8 text-[0.8125rem]',
}

export interface FieldProps {
	label?: ReactNode
	value?: ReactNode
	placeholder?: string
	/** Right-hand adornment: a unit, a chip, a score. */
	suffix?: ReactNode
	size?: 'sm' | 'md'
	className?: string
}

/** A field that displays a value. `TextField` is the one the writer types in. */
export function Field({
	label,
	value,
	placeholder,
	suffix,
	size = 'md',
	className,
}: FieldProps) {
	const empty = value === undefined || value === null || value === ''
	return (
		<div className={cx('flex items-center gap-2.5', className)}>
			{label ? (
				<span className="shrink-0 text-[0.8125rem] font-medium text-muted">{label}</span>
			) : null}
			<div className={cx(frameClass, sizeClass[size])}>
				<span
					className={cx('min-w-0 flex-1 truncate', empty ? 'text-faint' : 'text-ink')}
				>
					{empty ? placeholder : value}
				</span>
				{suffix}
			</div>
		</div>
	)
}

export interface TextFieldProps {
	/** Shown beside the field, and clicking it focuses the field. Where a row of
	 * fields carries no visible label, pass `hiddenLabel` instead. */
	label?: ReactNode
	/** Names the field for a screen reader when no label is shown. */
	hiddenLabel?: string
	value: string
	onChange: (value: string) => void
	placeholder?: string
	suffix?: ReactNode
	size?: 'sm' | 'md'
	/** More than one row renders a textarea, which is what an intent note wants. */
	rows?: number
	className?: string
}

/** The same frame, with the writer typing into it. */
export function TextField({
	label,
	hiddenLabel,
	value,
	onChange,
	placeholder,
	suffix,
	size = 'md',
	rows = 1,
	className,
}: TextFieldProps) {
	const handle = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		onChange(event.target.value)

	const inputClass =
		'min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-faint'

	return (
		<label
			className={cx('flex gap-2.5', rows > 1 ? 'items-start' : 'items-center', className)}
		>
			{label ? (
				<span className="shrink-0 pt-1.5 text-[0.8125rem] font-medium text-muted">
					{label}
				</span>
			) : null}
			<div
				className={cx(frameClass, rows > 1 ? 'py-1.5 text-[0.75rem]' : sizeClass[size])}
			>
				{rows > 1 ? (
					<textarea
						aria-label={hiddenLabel}
						className={cx(inputClass, 'resize-none leading-snug')}
						onChange={handle}
						placeholder={placeholder}
						rows={rows}
						value={value}
					/>
				) : (
					<input
						aria-label={hiddenLabel}
						className={inputClass}
						onChange={handle}
						placeholder={placeholder}
						type="text"
						value={value}
					/>
				)}
				{suffix}
			</div>
		</label>
	)
}

export interface InlineInputProps {
	/** Names the field for a screen reader. A row of these carries no visible
	 * label, so it is required rather than optional. */
	label: string
	value: string
	onChange: (value: string) => void
	onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
	placeholder?: string
	className?: string
}

/**
 * A field with no frame around it, for text that is already the thing on the
 * row — a Section title, an Adjective being added. It shows its edge on hover
 * and on focus, so a row of them reads as text until the writer reaches for it.
 */
export function InlineInput({
	label,
	value,
	onChange,
	onKeyDown,
	placeholder,
	className,
}: InlineInputProps) {
	return (
		<input
			aria-label={label}
			className={cx(
				'min-w-0 rounded-sm border-b border-transparent bg-transparent text-ink outline-none placeholder:text-faint hover:border-edge focus:border-edge',
				className,
			)}
			onChange={(event) => onChange(event.target.value)}
			onKeyDown={onKeyDown}
			placeholder={placeholder}
			type="text"
			value={value}
		/>
	)
}

export interface EmptySlotProps {
	children: ReactNode
	className?: string
}

/**
 * A dashed placeholder. In this design dashed always means "optional, and not
 * filled in yet" — it is never a disabled state.
 */
export function EmptySlot({ children, className }: EmptySlotProps) {
	return (
		<div
			className={cx(
				'flex items-center justify-center rounded-md border border-dashed border-edge px-3 py-2.5 text-center text-[0.75rem] text-faint',
				className,
			)}
		>
			{children}
		</div>
	)
}
