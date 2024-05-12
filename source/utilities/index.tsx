// TODO: use local storage to store and retrive token so user don't have to pass it every time
export const token = "twp_nOjjGPwvTnGLdsMx7tDW8LmR9Fm9"

export function teamwork(path: string = "projects", v3: boolean = true) {
	if (!token) return Promise.reject("No token provided")

	const myHeaders = new Headers()
	myHeaders.append("Content-Type", "application/json")
	myHeaders.append("Authorization", "Basic " + btoa(token + ":password"))

	let url = `https://wethecollective.teamwork.com/`
	if (v3) url += "projects/api/v3/"
	url += `${path}.json`

	return fetch(url, {
		method: "GET",
		headers: myHeaders,
	}).then((response) => response.json())
}
