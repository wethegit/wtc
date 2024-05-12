import React from "react"

import { TeamworkScreen } from "../../components/index.js"
import { AppProvider } from "../../providers/AppProvider.js"

export default function Index() {
	return (
		<AppProvider>
			<TeamworkScreen />
		</AppProvider>
	)
}
