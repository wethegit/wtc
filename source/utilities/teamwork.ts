// TODO: use local storage to store and retrive token so user don't have to pass it every time
export const TOKEN = "twp_nOjjGPwvTnGLdsMx7tDW8LmR9Fm9"

export interface TeamworkOptions {
	path: string
	version?: 1 | 2 | 3
}

export function teamwork({ path = "me", version = 3 }: TeamworkOptions) {
	const myHeaders = new Headers()
	myHeaders.append("Content-Type", "application/json")
	myHeaders.append("Authorization", "Basic " + btoa(TOKEN + ":password"))

	let url = `https://wethecollective.teamwork.com/`
	if (version === 3) url += "projects/api/v3/"
	else if (version === 2) url += "projects/api/v2/"
	url += `${path}.json`

	return fetch(url, {
		method: "GET",
		headers: myHeaders,
	}).then((response) => response.json())
}
