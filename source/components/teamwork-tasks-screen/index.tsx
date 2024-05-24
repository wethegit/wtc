import React, { useMemo, useState } from "react"
import Spinner from "ink-spinner"
import { Box, Static, Text } from "ink"
import { useQuery } from "@tanstack/react-query"
import SelectInput from "ink-select-input"

import { useAppContext } from "../../providers/index.js"
import { teamwork } from "../../utilities/index.js"
import { Breadcrumbs, SelectIndicator, SelectItem } from "../../components/index.js"

interface TeamworkTasksScreensProps {
	onSelectTask?: (taskId: number) => void
}
export function TeamworkTasksScreen({ onSelectTask }: TeamworkTasksScreensProps) {
	const { user } = useAppContext()
	const { data } = useQuery({
		queryKey: ["tasks"],
		queryFn: () => teamwork({ path: "tasks" }).then((data) => data.tasks),
	})
	const [highlighted, setHighlighted] = useState<unknown>()

	const selectItems = useMemo(
		() => data?.map((t: any) => ({ value: t.id, label: `${t.id} || ${t.name}` })),
		[data]
	)

	const handleSelect = (item: any) => {
		if (onSelectTask) onSelectTask(item.value)
	}

	if (!user || !data) return <Spinner type="dots" />

	return (
		<Box flexDirection="column">
			<Breadcrumbs title="Tasks" items={["tw", "tasks"]} />

			<SelectInput
				limit={5}
				items={selectItems}
				onSelect={handleSelect}
				itemComponent={SelectItem}
				indicatorComponent={SelectIndicator}
				onHighlight={setHighlighted}
			/>

			<Box borderColor="gray" borderStyle="single" paddingLeft={1} paddingRight={1}>
				<Text color="gray">
					<Text color="yellow">
						{"<"}
						<Text bold>C</Text>
						{">"}
					</Text>{" "}
					Mark as complete
				</Text>
			</Box>
		</Box>
	)
}
