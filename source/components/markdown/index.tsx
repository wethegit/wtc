import React, { useEffect, useState } from "react"
import { marked } from "marked"
import { markedTerminal } from "marked-terminal"
import Spinner from "ink-spinner"
import { Text } from "ink"

marked.use(markedTerminal())

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
