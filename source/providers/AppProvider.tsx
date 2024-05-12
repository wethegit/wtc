import React, { createContext, useContext, useEffect, useState } from "react"
import { token as defaultToken, teamwork } from "../utilities/index.js"
import { Newline, Static, Text } from "ink"

interface AppError {
	id: string
	title: string
	detail: string
}

interface User {
	id: number
	firstName: string
	lastName: string
	title: string
	emailAddress: string
	administrator: boolean
}

interface AppContextType {
	setToken: (token: string) => void
	token?: string
	user?: User
	error?: AppError[]
	isLoading?: boolean
}

const MISSING_TOKEN_ERROR: AppError = {
	id: "missing_token",
	title: "Missing token",
	detail:
		"An API token is required to interact with Teamwork. To learn how to get one, visit\nhttps://support.teamwork.com/projects/using-teamwork/locating-your-api-key",
}

const AppContext = createContext<AppContextType>({
	setToken: (token: string) => {},
})

export function useAppContext() {
	return useContext(AppContext)
}

export function AppProvider({ children }: { children: React.ReactNode }) {
	const [token, setToken] = useState(defaultToken)
	const [user, setUser] = useState<User>()
	const [error, setError] = useState<AppError[]>([])

	useEffect(() => {
		teamwork("me")
			.then((data) => {
				setUser(data.person)
			})
			.catch((error) => {
				console.log("error")
				console.log(error.errors)
				setError(error.errors)
			})
	}, [])

	useEffect(() => {
		if (!token) {
			setError([MISSING_TOKEN_ERROR])
		}
	}, [token])

	return (
		<AppContext.Provider
			value={{ token, setToken, user, error, isLoading: !user && !error }}
		>
			<Static<AppError> items={[...error]}>
				{(error) => (
					<Text key={error.id}>
						<Text color="red">[ERROR]</Text>{" "}
						<Text color="gray">
							{error.title}
							<Newline />
							{error.detail}
						</Text>
					</Text>
				)}
			</Static>

			{children}
		</AppContext.Provider>
	)
}
