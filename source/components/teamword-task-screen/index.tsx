import React, { useMemo } from "react"
import SelectInput from "ink-select-input"
import { useQuery } from "@tanstack/react-query"
import { Box, Text } from "ink"
import Spinner from "ink-spinner"

import { teamwork } from "../../utilities/index.js"
import { Breadcrumbs } from "../breadcrumbs/index.js"
import { Markdown } from "../markdown/index.js"

export function TeamworkTaskScreen({ id }: { id: number }) {
	const { data, error } = useQuery({
		queryKey: ["task", id],
		queryFn: () => teamwork({ path: `tasks/${id}` }).then((data) => data.task),
	})
	const isLoading = !data && !error

	const handleSelectInput = (item: any) => {}

	if (isLoading) return <Spinner type="dots" />

	console.log({ d: data.description })

	return (
		<Box flexDirection="column">
			<Breadcrumbs items={["tw", "task", "" + id]} title={data.name} />

			<Text>{data.description}</Text>
			<Box overflow="hidden" borderStyle="single">
				<Markdown body={data.description} />
			</Box>

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
