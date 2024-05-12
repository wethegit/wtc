import { useEffect, useState } from "react"

import { teamwork } from "../utilities/index.js"

export function useUser() {
	const [user, setUser] = useState()
	const [error, setError] = useState()

	useEffect(() => {
		teamwork("people/utilization")
			.then((data) => {
				setUser(data)
			})
			.catch((error) => {
				console.log(error)
				setError(error)
			})
	}, [])

	return {
		user,
		error,
		isLoading: !user && !error,
	}
}
