import React from "react"
import zod from "zod"

import { TeamworkTaskScreen } from "../../components/index.js"

export const args = zod.number()

type Props = {
	args: zod.infer<typeof args>
}

export default function Index({ args }: Props) {
	return <TeamworkTaskScreen id={args} />
}
