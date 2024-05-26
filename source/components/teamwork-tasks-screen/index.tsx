import React, { useMemo, useState } from "react"
import Spinner from "ink-spinner"
import { Text, Box, useInput } from "ink"
import { useQuery } from "@tanstack/react-query"
import figures from "figures"

import { useAppContext } from "../../providers/index.js"
import { teamwork } from "../../utilities/index.js"
import {
	Breadcrumbs,
	ControlBar,
	MainContent,
	SelectIndicator,
	QuickSearch,
} from "../index.js"
import type { InputItem } from "../index.js"

interface TeamworkTasksScreensProps {
	onSelectTask?: (taskId: number) => void
}

function SelectItem({
	item,
	isSelected,
}: {
	isSelected: boolean
	item: {
		label: string
	}
}) {
	const { id, projectName, listName, name } = JSON.parse(item.label)

	return (
		<Box
			borderStyle="single"
			borderColor={isSelected ? "green" : "gray"}
			flexDirection="column"
			flexGrow={1}
			paddingRight={1}
			paddingLeft={1}
		>
			<Text color="gray">{projectName}</Text>
			<Text color="gray">
				<Text color={isSelected ? "green" : "white"}>{name}</Text>
			</Text>
			<Text color="gray">{listName}</Text>
		</Box>
	)
}

export function TeamworkTasksScreen({ onSelectTask }: TeamworkTasksScreensProps) {
	const { user } = useAppContext()
	const userId = user?.id
	const { data } = useQuery({
		queryKey: ["tasks", userId],
		queryFn: () =>
			teamwork({
				version: 1,
				path: "tasks",
				params: [`responsible-party-ids=${userId}`, "getSubTasks=yes", "sort=duedate"],
			}).then((data) => data["todo-items"]),
		enabled: !!userId,
	})
	const [highlighted, setHighlighted] = useState<InputItem>()

	const selectItems = useMemo<InputItem[]>(
		() =>
			data?.map((t: any) => ({
				value: t.id,
				label: JSON.stringify({
					id: t.id,
					projectName: t["project-name"],
					listName: t["todo-list-name"],
					name: t.content,
				}),
			})),
		[data]
	)

	const handleSelect = (item: any) => {
		if (onSelectTask) onSelectTask(item.value)
	}

	useInput((input, key) => {
		if (!key.ctrl) return

		if (input === "q") {
			// TODO: Mark as complete
			console.log({ highlighted })
		}
	})

	if (!user || !data) return <Spinner type="dots" />

	return (
		<Box flexDirection="column">
			<Breadcrumbs title="Tasks" items={["tw", "tasks"]} />

			<MainContent>
				<QuickSearch
					items={selectItems}
					onSelect={handleSelect}
					itemComponent={SelectItem}
					indicatorComponent={SelectIndicator}
					onHighlight={setHighlighted}
					limit={5}
				/>
			</MainContent>

			{/* <SelectInput
				limit={5}
				items={selectItems}
				onSelect={handleSelect}
				itemComponent={SelectItem}
				indicatorComponent={SelectIndicator}
				onHighlight={setHighlighted}
			/> */}

			<ControlBar
				items={[
					{
						key: "q",
						label: "Mark as complete",
					},
				]}
			/>
		</Box>
	)
}
