import React, { createContext, useContext } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { teamwork } from "../utilities/index.js"

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
	user?: User
	error: Error | null
	isLoading?: boolean
}

const AppContext = createContext<AppContextType>({ error: null })

function AuthProvider({ children }: { children: React.ReactNode }) {
	const { data: user, error } = useQuery({
		queryKey: ["user"],
		queryFn: () => teamwork({ path: "me" }).then((data) => data.person),
	})

	return (
		<AppContext.Provider value={{ user, error, isLoading: !user && !error }}>
			{children}
		</AppContext.Provider>
	)
}

export function useAppContext() {
	return useContext(AppContext)
}

// Create a client
const queryClient = new QueryClient()

export function AppProvider({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>{children}</AuthProvider>
		</QueryClientProvider>
	)
}
