import React from "react"
import { Box, Text } from "ink"
import SelectInput from "ink-select-input"

import { Header } from "../header/index.js"
import { SelectIndicator } from "../select-indicator/index.js"
import { SelectItem } from "../select-item/index.js"

interface Item {
	label: string
	value: string
}

export type OnSelectItem = (item: Item) => void

export interface HomeScreenProps {
	items: Item[]
	onSelectItem: OnSelectItem
}

export function HomeScreen({ items, onSelectItem }: HomeScreenProps) {
	return (
		<Box paddingBottom={2} flexDirection="column">
			<Box flexDirection="column" alignItems="center">
				<Header />
				<Text>Welcome to our CLI</Text>
				<Text>I hope you feel at home here</Text>
			</Box>

			<Box marginTop={2} flexDirection="column">
				<Box marginLeft={1}>
					<Text>What would you like to do?:</Text>
				</Box>

				<Box marginTop={1} flexDirection="column">
					<SelectInput
						items={items}
						onSelect={onSelectItem}
						indicatorComponent={SelectIndicator}
						itemComponent={SelectItem}
					/>
				</Box>
			</Box>
		</Box>
	)
}
