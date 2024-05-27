import { Box, BoxProps } from "ink"
import React from "react"

interface MainContentProps extends BoxProps {
	children?: React.ReactNode
}

export function MainContent({ children, ...props }: MainContentProps) {
	return (
		<Box {...props} flexDirection="column">
			<Box borderTop borderBottom={false} borderStyle="single" />

			<Box flexDirection="column" overflow="hidden" paddingLeft={2} paddingRight={2}>
				{children}
			</Box>

			<Box borderBottom borderTop={false} borderStyle="single" />
		</Box>
	)
}
