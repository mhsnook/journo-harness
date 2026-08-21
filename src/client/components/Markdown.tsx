import type { AnchorHTMLAttributes } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remend from 'remend'

import { cx } from '../lib/cx'

/**
 * A guide turn arrives as markdown and lands a token at a time, so the text is
 * incomplete on every frame but the last: `**Birds` is two asterisks and a word
 * until its closing pair arrives. `remend` closes whatever the last token left
 * open, which is what stops the marks flickering as the turn streams.
 *
 * Raw HTML is dropped rather than rendered. react-markdown ignores it unless
 * `rehype-raw` is added, and a model's output is not markup we trust.
 *
 * The blocks are styled by `.prose-chat` in theme.css rather than by classes
 * here, because react-markdown renders plain tags — the same arrangement as
 * `.prose-draft` and the editor.
 */

export interface MarkdownProps {
	/** The markdown source, whole or mid-stream. */
	children: string
	className?: string
}

/** A model can cite a source, and a citation opens away from the harness so the
 * writer does not lose the draft they are reading. */
function Link({ children, href, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
	return (
		<a {...rest} href={href} rel="noreferrer noopener" target="_blank">
			{children}
		</a>
	)
}

const components: Components = { a: Link }

export function Markdown({ children, className }: MarkdownProps) {
	// `text-only` drops a half-typed link's markup rather than pointing it at a
	// placeholder URL the reader could click.
	const mended = remend(children, { linkMode: 'text-only' })

	return (
		<div className={cx('prose-chat', className)}>
			<ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
				{mended}
			</ReactMarkdown>
		</div>
	)
}
