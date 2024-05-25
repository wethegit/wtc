import React, { useMemo, useState } from "react"
import Spinner from "ink-spinner"
import { Box, useInput } from "ink"
import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../../providers/index.js"
import { teamwork } from "../../utilities/index.js"
import {
	Breadcrumbs,
	ControlBar,
	MainContent,
	SelectIndicator,
	SelectItem,
	QuickSearch,
} from "../index.js"
import type { InputItem } from "../index.js"

interface TeamworkTasksScreensProps {
	onSelectTask?: (taskId: number) => void
}

export function TeamworkTasksScreen({ onSelectTask }: TeamworkTasksScreensProps) {
	const { user } = useAppContext()
	const { data } = useQuery({
		queryKey: ["tasks"],
		queryFn: () => teamwork({ path: "tasks" }).then((data) => data.tasks),
	})
	const [highlighted, setHighlighted] = useState<InputItem>()

	const selectItems = useMemo<InputItem[]>(
		() => data?.map((t: any) => ({ value: t.id, label: `${t.id} || ${t.name}` })),
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
