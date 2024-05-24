import React from "react"
import Spinner from "ink-spinner"
import { Box, Text } from "ink"
import { useQuery } from "@tanstack/react-query"

import { useAppContext } from "../../providers/index.js"
import { teamwork } from "../../utilities/index.js"

export function TeamworkScreen() {
	const { user } = useAppContext()
	const { data } = useQuery({
		queryKey: ["tasks"],
		queryFn: () => teamwork({ path: "tasks" }).then((data) => data.tasks),
	})

	if (!user || !data) return <Spinner type="dots" />

	return (
		<Box flexDirection="column">
			<Text>
				Hello,{" "}
				<Text color="green">
					{user.firstName}, {user.id}
				</Text>
			</Text>
			{data?.map((task: any) => (
				<Box key={task.id} padding={1} gap={1} borderColor="gray" borderStyle="single">
					<Text dimColor color="gray">
						{task.id}
					</Text>
					<Text>{task.name}</Text>
				</Box>
			))}
		</Box>
	)
}
