import { Box } from "ink"
import React from "react"

export function MainContent({ children }: { children: React.ReactNode }) {
	return (
		<Box flexDirection="column">
			<Box borderTop borderBottom={false} borderStyle="single" />

			<Box flexDirection="column" overflow="hidden" paddingLeft={2} paddingRight={2}>
				{children}
			</Box>

			<Box borderBottom borderTop={false} borderStyle="single" />
		</Box>
	)
}
