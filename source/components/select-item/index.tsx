import React from "react"
import { Box, Text } from "ink"

const COLOR = "gray"
const COLOR_ACTIVE = "green"

export function SelectItem({
	isSelected,
	label,
}: {
	isSelected?: boolean
	label: string
}) {
	const [dimmed, ...rest] = label.split("||")

	return (
		<Box
			flexGrow={1}
			gap={1}
			paddingLeft={1}
			paddingRight={1}
			borderColor={isSelected ? COLOR_ACTIVE : COLOR}
			borderStyle={isSelected ? "bold" : "single"}
		>
			{dimmed && (
				<Text dimColor color={isSelected ? COLOR_ACTIVE : COLOR}>
					{dimmed.trim()}
				</Text>
			)}
			{rest.map((s, i) => (
				<Text key={s + i}>{s.trim()}</Text>
			))}
		</Box>
	)
}
