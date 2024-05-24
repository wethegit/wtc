import React from "react"
import { Box, Text } from "ink"

export function SelectIndicator({ isSelected }: { isSelected?: boolean }) {
	return (
		<Box padding={1}>{isSelected ? <Text color="green">→</Text> : <Text> </Text>}</Box>
	)
}
