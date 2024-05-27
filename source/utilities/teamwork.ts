// TODO: use local storage to store and retrive token so user don't have to pass it every time
export const TOKEN = "twp_nOjjGPwvTnGLdsMx7tDW8LmR9Fm9"

export const API_URL = `https://wethecollective.teamwork.com/`

export interface TeamworkOptions {
	path: string
	version?: 1 | 2 | 3
	params?: string[]
}

export function teamwork({ params, path = "me", version = 3 }: TeamworkOptions) {
	const myHeaders = new Headers()
	myHeaders.append("Content-Type", "application/json")
	myHeaders.append("Authorization", "Basic " + btoa(TOKEN + ":password"))

	let url = API_URL
	if (version === 3) url += "projects/api/v3/"
	else if (version === 2) url += "projects/api/v2/"
	url += `${path}.json`

	if (params) {
		url += `?${params.join("&")}`
		console.log({ url })
	}

	return fetch(url, {
		method: "GET",
		headers: myHeaders,
	}).then((response) => response.json())
}

export function buildCommentUrl(taskId: number, commentId: number) {
	return `${buildTaskUrl(taskId)}?c=${commentId}`
}

export function buildTaskUrl(taskId: number) {
	return `${API_URL}tasks/${taskId}`
}
