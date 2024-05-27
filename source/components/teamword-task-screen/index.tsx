import React from "react"
import SelectInput from "ink-select-input"
import { useQuery } from "@tanstack/react-query"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"

import { buildCommentUrl, buildTaskUrl, teamwork } from "../../utilities/index.js"
import { Breadcrumbs } from "../breadcrumbs/index.js"
import { MainContent } from "../main-content/index.js"
import { Markdown } from "../markdown/index.js"
import { Divider } from "../divider/index.js"
import Link from "ink-link"

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
			teamwork({ path: `tasks/${id}`, version: 1, params: ["include=comments"] }).then(
				(data) => data["todo-item"]
			),
	})
	const isLoading = !data && !error

	const { data: comments, error: commentsError } = useQuery({
		queryKey: ["task", id, "comments"],
		queryFn: () =>
			teamwork({ path: `tasks/${id}/comments`, version: 1 }).then(
				(data) => data.comments
			),
	})

	const handleSelectInput = (item: any) => {
		if (item.value === "b") {
			if (onSelectBack) onSelectBack()
		}
	}

	if (isLoading) return <Spinner type="dots" />

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

	const loadingComments = !comments && !commentsError

	return (
		<Box flexDirection="column">
			<Breadcrumbs items={["tw", "task", "" + id]} title={content} />

			<Box
				paddingLeft={1}
				paddingRight={1}
				borderStyle="single"
				borderColor="gray"
				flexDirection="column"
				gap={1}
			>
				<Link url={buildTaskUrl(id)}>
					<Text underline color="gray">
						{buildTaskUrl(id)}
					</Text>
				</Link>

				<Box>
					<Box flexGrow={1} gap={1}>
						<Box flexDirection="column" alignItems="flex-end">
							{parentTask && <Text>Parent task:</Text>}
							<Text>Project:</Text>
							<Text>List:</Text>
							<Text>Created by:</Text>
							<Text>Updated by:</Text>
						</Box>

						<Box flexDirection="column" alignItems="flex-start">
							{parentTask && <Text>{parentTask.content}</Text>}
							<Text>{projectName}</Text>
							<Text>{listName}</Text>
							<Text>
								{creatorFirstName} {creatorLastName}
							</Text>
							<Text>
								{updaterFirstName} {updaterLastName}
							</Text>
						</Box>
					</Box>

					<Box flexGrow={1} gap={1}>
						<Box flexDirection="column" alignItems="flex-end">
							<Text>Assigned:</Text>
							<Text>Start Date:</Text>
							<Text>Due Date:</Text>
							<Text>Created:</Text>
							<Text>Last Changed:</Text>
						</Box>

						<Box flexDirection="column" alignItems="flex-start">
							<Text>{responsibleNames}</Text>
							<Text>{prettyPrintDate(startDate, true)}</Text>
							<Text>{prettyPrintDate(dueDate, true)}</Text>
							<Text>{prettyPrintDate(createdOn)}</Text>
							<Text>{prettyPrintDate(lastChangedOn)}</Text>
						</Box>
					</Box>
				</Box>
			</Box>

			{description && (
				<MainContent>
					<Text bold>Description</Text>
					<Divider borderColor="white" />
					{descriptionContentType === "TEXT" ? (
						<Text>{description}</Text>
					) : (
						<Markdown body={description} />
					)}
				</MainContent>
			)}

			{loadingComments ? (
				<Spinner type="dots11" />
			) : (
				<MainContent>
					<Text bold>Comments</Text>
					<Divider borderColor="white" />
					{comments.map(
						(
							{
								body,
								["author-firstname"]: authorFirstName,
								["author-lastname"]: authorLastName,
								datetime,
								...comment
							}: any,
							i: number
						) => {
							return (
								<Box key={comment.id} flexDirection="column">
									{i !== 0 && <Divider />}

									<Box justifyContent="flex-start" marginBottom={1} gap={3} flexGrow={1}>
										<Link url={buildCommentUrl(comment.id, id)}>
											<Text underline color="gray">
												{prettyPrintDate(datetime)}
											</Text>
										</Link>

										<Text bold>
											{authorFirstName} {authorLastName}
										</Text>
									</Box>

									<Text>{body}</Text>
								</Box>
							)
						}
					)}
				</MainContent>
			)}

			<SelectInput items={[{ label: "Back", value: "b" }]} onSelect={handleSelectInput} />
		</Box>
	)
}

function prettyPrintDate(d: string, convert?: boolean) {
	const date = convert ? d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8) : d

	return new Date(date).toLocaleDateString("en-CA", { dateStyle: "medium" })
}
