import React from "react"
import Spinner from "ink-spinner"
import { Text } from "ink"

import { useAppContext } from "../../providers/index.js"

export function TeamworkScreen() {
	const { user } = useAppContext()

	if (!user) return <Spinner type="dots" />

	return (
		<Text>
			Hello, <Text color="green">{user.firstName}</Text>
		</Text>
	)
}
