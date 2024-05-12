import React, { useState } from "react"

import { HomeScreen } from "../components/index.js"
import type { OnSelectItem } from "../components/home-screen/index.js"

import { default as TwCommand } from "../commands/tw/index.js"

export default function Index() {
	const [screen, setScreen] = useState("home")
	const handleSelectItem: OnSelectItem = (item) => {
		setScreen(item.value)
	}

	if (screen === "home")
		return (
			<HomeScreen
				items={[
					{
						title: "tw",
						detail: "Interact with Teamwork",
						value: "tw",
					},
					{
						title: "q",
						detail: "Quit the program",
						value: "q",
					},
				]}
				onSelectItem={handleSelectItem}
			/>
		)

	if (screen === "tw") return <TwCommand />

	return
}
