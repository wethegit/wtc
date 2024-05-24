import React, { useState } from "react"

import { TeamworkTaskScreen, TeamworkTasksScreen } from "../../components/index.js"

export default function Index() {
	const [task, setTask] = useState<number>(0)

	if (task > 0) return <TeamworkTaskScreen id={task} />

	return <TeamworkTasksScreen onSelectTask={setTask} />
}
