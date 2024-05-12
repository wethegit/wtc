import React, { useState } from "react"
import { Box, Text, useApp, useInput } from "ink"

import { Header } from "../header/index.js"

export interface Item {
	title: string
	detail: string
	value: string
}

export type OnSelectItem = (item: Item) => void

export interface HomeScreenProps {
	items: Item[]
	onSelectItem: OnSelectItem
}

export function HomeScreen({ items, onSelectItem }: HomeScreenProps) {
	const [cursor, setCursor] = useState<number>(0)

	useInput((input, key) => {
		if (key.downArrow) {
			setCursor((prev) => (prev + 1) % 2)
			return
		}

		if (key.upArrow) {
			setCursor((prev) => (prev - 1 + 2) % 2)
			return
		}

		const inputNumber = parseInt(input)
		let item

		if (inputNumber > 0 && inputNumber <= items.length) item = items[inputNumber - 1]

		if (key.return || input === " ") item = items[cursor]

		if (item) onSelectItem(item)
	})

	return (
		<Box paddingBottom={2} flexDirection="column">
			<Box flexDirection="column" alignItems="center">
				<Header />
				<Text>Welcome to our CLI</Text>
				<Text>I hope you feel at home here</Text>
			</Box>

			<Box marginTop={2} flexDirection="column">
				<Text>What would you like to do?:</Text>

				<Box marginTop={1} flexDirection="column">
					{items.map((item, index) => (
						<Box key={item.value + index}>
							<Text color={cursor === index ? "green" : "white"}>
								{index + 1}. {item.title}
							</Text>
							<Text color="gray"> - {item.detail}</Text>
						</Box>
					))}
				</Box>
			</Box>
		</Box>
	)
}
