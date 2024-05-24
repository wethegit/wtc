import React, { useState } from "react"

import { HomeScreen } from "../components/index.js"
import type { OnSelectItem } from "../components/home-screen/index.js"
import { default as TwTasksCommand } from "../commands/tw/tasks.js"

const COMMANDS = [
	{
		label: "tw || Interact with Teamwork",
		value: "tw",
	},
	{
		label: "q || Quit the program",
		value: "q",
	},
]

export default function Index() {
	const [screen, setScreen] = useState("home")
	const handleSelectItem: OnSelectItem = (item) => {
		setScreen(item.value)
	}

	if (screen === "home")
		return <HomeScreen items={COMMANDS} onSelectItem={handleSelectItem} />

	if (screen === "tw") return <TwTasksCommand />

	return
}
