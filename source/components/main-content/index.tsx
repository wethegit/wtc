import { Text, Box, BoxProps } from "ink"
import React from "react"
import { Divider } from "../divider/index.js"

interface MainContentProps extends BoxProps {
	children?: React.ReactNode
	title?: string
}

export function MainContent({ title, children, ...props }: MainContentProps) {
	return (
		<Box {...props} flexDirection="column">
			<Box borderTop borderBottom={false} borderStyle="single" />

			<Box flexDirection="column" overflow="hidden" paddingLeft={2} paddingRight={2}>
				{title && (
					<>
						<Text bold>{title}</Text>
						<Divider borderColor="white" />
					</>
				)}
				{children}
			</Box>

			<Box borderBottom borderTop={false} borderStyle="single" />
		</Box>
	)
}
