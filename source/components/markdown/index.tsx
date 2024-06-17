import React, { useEffect, useState } from "react"
import { marked } from "marked"
import { markedTerminal } from "marked-terminal"
import Spinner from "ink-spinner"
import { Text } from "ink"
import terminalImage from "term-img"

const fallback = (href: string) => {
	return href
}

marked.use(
	markedTerminal({
		image: function (href: string, title: string, text: string) {
			return terminalImage(href, { fallback: () => fallback(href) })
		},
	})
)

interface MarkdownProps {
	body: string
}

export function Markdown({ body = "" }: MarkdownProps) {
	const [text, setText] = useState<string>()
	const [loading, setLoading] = useState<boolean>(true)

	useEffect(() => {
		const load = (data: string) => {
			setText(data)
			setLoading(false)
		}

		const parsed = marked.parse(body)

		if (typeof parsed === "string") load(parsed)
		else parsed.then(load)
	}, [body])

	if (loading) return <Spinner type="dots11" />

	return <Text>{text}</Text>
}
