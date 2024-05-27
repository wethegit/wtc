import React from "react"
import { Box, BoxProps } from "ink"

interface DividerProps extends BoxProps {
	children?: React.ReactNode
}

export function Divider({ children, borderColor = "gray", ...props }: DividerProps) {
	return (
		<Box
			borderColor={borderColor}
			borderStyle="single"
			borderRight={false}
			borderLeft={false}
			borderTop={false}
			{...props}
		>
			{children}
		</Box>
	)
}
