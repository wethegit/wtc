import { useState } from "react"
import { useInput } from "ink"

export function useSelect(onSelectItem: (cursor: number) => void) {
	const [cursor, setCursor] = useState<number>(0)

	useInput((input, key) => {
		if (key.downArrow) {
			setCursor((prev) => prev + 1)
			return
		}

		if (key.upArrow) {
			setCursor((prev) => prev - 1)
			return
		}

		const inputNumber = parseInt(input)
		if (inputNumber > 0) onSelectItem(inputNumber)

		if (key.return || input === " ") onSelectItem(cursor)
	})

	return cursor
}
