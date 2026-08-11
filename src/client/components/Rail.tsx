import { cx } from '../lib/cx'

/**
 * A row of pills where one or more are on: the Panel rail in the Article bar,
 * and the View rail on the Plan Panel's Outline heading.
 *
 * **Deliberately not accented.** What is on is state, not a call to action, so
 * the on pill is solid ink and the yellow stays free for the one thing on
 * screen that wants a decision — `foundations/Accent.mdx`.
 *
 * Static without `onPick`, which is how a rail reads when it is showing what is
 * open rather than offering to change it.
 */

export interface RailProps<Item extends string> {
	items: readonly Item[]
	/** Which items are on. One for a View rail, several for the Panel rail. */
	on: readonly Item[]
	/** Omit to render the rail as a static indicator. */
	onPick?: (item: Item) => void
	/** Names the set for a screen reader: "Visible Panels". */
	label: string
	className?: string
}

export function Rail<Item extends string>({
	items,
	on,
	onPick,
	label,
	className,
}: RailProps<Item>) {
	return (
		<div
			aria-label={onPick ? label : undefined}
			className={cx(
				'flex shrink-0 items-center gap-0.5 rounded-full border border-edge bg-sunk p-0.5',
				className,
			)}
			role={onPick ? 'group' : undefined}
		>
			{items.map((item) => {
				const isOn = on.includes(item)
				const Tag = (onPick ? 'button' : 'span') as 'button'

				return (
					<Tag
						key={item}
						{...(onPick
							? {
									type: 'button' as const,
									onClick: () => onPick(item),
									'aria-pressed': isOn,
								}
							: {})}
						className={cx(
							'rounded-full px-2.5 py-1 text-[0.6875rem] leading-none font-medium transition-colors',
							isOn ? 'bg-ink text-paper' : 'text-faint',
							onPick && !isOn && 'hover:bg-hush hover:text-muted',
						)}
					>
						{item}
					</Tag>
				)
			})}
		</div>
	)
}
