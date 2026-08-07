import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cx } from '../lib/cx'

export type ButtonVariant = 'default' | 'accent' | 'quiet' | 'link'
export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends Omit<
	ButtonHTMLAttributes<HTMLButtonElement>,
	'children'
> {
	/**
	 * `accent` is the yellow one. A screen should have at most one — it marks
	 * the single thing the app wants you to do next.
	 */
	variant?: ButtonVariant
	size?: ButtonSize
	children?: ReactNode
}

const variantClass: Record<ButtonVariant, string> = {
	default: 'border border-edge bg-surface text-ink hover:border-ink/40 hover:bg-hush',
	accent: 'border border-accent-edge bg-accent text-accent-ink hover:brightness-[0.97]',
	quiet:
		'border border-transparent bg-transparent text-muted hover:border-edge hover:text-ink',
	link: 'border-0 bg-transparent p-0 text-muted underline decoration-edge underline-offset-[3px] hover:text-ink hover:decoration-ink/40',
}

const sizeClass: Record<ButtonSize, string> = {
	sm: 'h-6 gap-1.5 rounded-full px-2.5 text-[0.75rem]',
	md: 'h-8 gap-2 rounded-full px-3.5 text-[0.8125rem]',
}

export function Button({
	variant = 'default',
	size = 'md',
	className,
	children,
	type = 'button',
	...rest
}: ButtonProps) {
	return (
		<button
			type={type}
			className={cx(
				'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background-color,border-color,color,filter]',
				variant === 'link' ? 'h-auto text-[0.8125rem]' : sizeClass[size],
				variantClass[variant],
				className,
			)}
			{...rest}
		>
			{children}
		</button>
	)
}
