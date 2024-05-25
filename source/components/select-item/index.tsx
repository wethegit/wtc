import React from "react"
import { Box, Text } from "ink"

const COLOR = "gray"
const COLOR_ACTIVE = "green"

interface SelectItemPropsBase {
	isSelected?: boolean
}

interface SelectItemPropsWithLabel extends SelectItemPropsBase {
	label: string
	item?: never
}

interface SelectItemPropsWithItem extends SelectItemPropsBase {
	item: { label: string }
	label?: never
}

type SelectItemProps = SelectItemPropsWithLabel | SelectItemPropsWithItem

export function SelectItem({ isSelected, ...props }: SelectItemProps) {
	const [dimmed, ...rest] =
		typeof props.label === "string"
			? props.label.split("||")
			: props.item.label.split("||")

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
