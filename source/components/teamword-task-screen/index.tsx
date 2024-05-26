import React from "react"
import SelectInput from "ink-select-input"
import { useQuery } from "@tanstack/react-query"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"

import { teamwork } from "../../utilities/index.js"
import { Breadcrumbs } from "../breadcrumbs/index.js"
import { MainContent } from "../main-content/index.js"
import { Markdown } from "../markdown/index.js"

export function TeamworkTaskScreen({
	onSelectBack,
	id,
}: {
	id: number
	onSelectBack?: () => void
}) {
	const { data, error } = useQuery({
		queryKey: ["task", id],
		queryFn: () =>
			teamwork({ path: `tasks/${id}`, version: 1 }).then((data) => data["todo-item"]),
	})
	const isLoading = !data && !error

	const handleSelectInput = (item: any) => {
		if (item.value === "b") {
			if (onSelectBack) onSelectBack()
		}
	}

	if (isLoading) return <Spinner type="dots" />

	console.log({ data })

	// createdBy
	// createdAt
	// parentTaskId
	// taskListId
	// assigneeUsers
	// createdByUser

	const {
		content,
		description,
		descriptionContentType,
		["project-name"]: projectName,
		["todo-list-name"]: listName,
		["creator-firstname"]: creatorFirstName,
		["creator-lastname"]: creatorLastName,
		["updater-firstname"]: updaterFirstName,
		["updater-lastname"]: updaterLastName,
		["start-date"]: startDate,
		["due-date"]: dueDate,
		["created-on"]: createdOn,
		["last-changed-on"]: lastChangedOn,
		priority,
		["responsible-party-names"]: responsibleNames,
		["parent-task"]: parentTask,
	} = data

	return (
		<Box flexDirection="column">
			<Breadcrumbs items={["tw", "task", "" + id]} title={content} />

			<Box borderStyle="single" borderColor="gray" gap={4}>
				<Box flexGrow={1} flexDirection="column">
					<Text>Project: {projectName}</Text>
					<Text>List: {listName}</Text>
					<Text>
						Created By: {creatorFirstName} {creatorLastName}
					</Text>
					<Text>
						Updated By: {updaterFirstName} {updaterLastName}
					</Text>
				</Box>
				<Box flexGrow={1} flexDirection="column">
					<Text>Start Date: {prettyPrintDate(startDate, true)}</Text>
					<Text>Due Date: {prettyPrintDate(dueDate, true)}</Text>
					<Text>Created: {prettyPrintDate(createdOn)}</Text>
					<Text>Last Changed: {prettyPrintDate(lastChangedOn)}</Text>
				</Box>
			</Box>

			{description && (
				<MainContent>
					{descriptionContentType === "TEXT" ? (
						<Text>{description}</Text>
					) : (
						<Markdown body={description} />
					)}
				</MainContent>
			)}

			<SelectInput
				items={[
					{ label: "Back", value: "b" },
					{ label: "Mark as complete", value: "c" },
				]}
				onSelect={handleSelectInput}
			/>
		</Box>
	)
}

function prettyPrintDate(d: string, convert?: boolean) {
	const date = convert ? d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8) : d
	console.log({ date })
	return new Date(date).toLocaleDateString("en-CA", { dateStyle: "medium" })
}
