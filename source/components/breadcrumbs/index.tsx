import React from "react"
import { Box, Text } from "ink"

import { useAppContext } from "../../providers/AppProvider.js"

const COLOR = "gray"
const COLOR_ACTIE = "#ffffff"

export function Breadcrumbs({ items, title }: { items: string[]; title?: string }) {
	const { user } = useAppContext()

	return (
		<Box
			paddingLeft={1}
			paddingRight={1}
			borderStyle="single"
			borderColor={COLOR}
			gap={1}
			justifyContent="space-between"
		>
			<Box gap={1}>
				<Text color={COLOR}>$:</Text>
				{items.map((n, i) => {
					const isLast = i === items.length - 1
					return (
						<Box gap={1} key={n + i}>
							<Text color={isLast ? COLOR_ACTIE : COLOR}>{n}</Text>
							{!isLast && <Text color={COLOR}>/</Text>}
						</Box>
					)
				})}
			</Box>
			<Text color="yellow" bold>
				{title}
			</Text>
			<Box gap={1}>
				<Text color={COLOR}>Hello,</Text>
				<Text color={COLOR_ACTIE}>{user?.firstName}</Text>
			</Box>
		</Box>
	)
}
