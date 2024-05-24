import React from "react"
import type { AppProps } from "pastel"

import { AppProvider } from "../providers/AppProvider.js"

export default function App({ Component, commandProps }: AppProps) {
	return (
		<AppProvider>
			<Component {...commandProps} />
		</AppProvider>
	)
}
