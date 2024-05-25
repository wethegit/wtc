import { Box, Text } from "ink"
import React from "react"

interface ControlItem {
	key: string
	label: string
}

interface ControlBarProps {
	items: ControlItem[]
}

export function ControlBar({ items = [] }: ControlBarProps) {
	const exitControl: ControlItem = { key: "c", label: "Exit" }

	return (
		<Box gap={2} borderColor="gray" borderStyle="single" paddingLeft={1} paddingRight={1}>
			<Text color="yellow" bold>
				Ctrl +{" "}
			</Text>

			{[exitControl, ...items].map(({ key, label }) => (
				<Text key={key + label} color="gray">
					<Text color="yellow">
						{"<"}
						<Text bold>{key}</Text>
						{">"}
					</Text>{" "}
					{label}
				</Text>
			))}
		</Box>
	)
}
