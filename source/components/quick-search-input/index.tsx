import React, {
	FunctionComponent,
	FC,
	useState,
	useEffect,
	useRef,
	useMemo,
	PropsWithChildren,
} from "react"
import { useStdin, Text, Box } from "ink"
import hasAnsi from "has-ansi"
import isEqual from "lodash/isEqual.js"
// @ts-ignore This module makes stdin emit keypress events,
// that's it.  Hasn't been published in six years, no types
// available.
import keypress from "keypress"

const defaultValue = { label: "" } // Used as return for empty array

type IsSelected = PropsWithChildren<{
	isSelected: boolean
}>

export interface InputItem {
	label: string
	value?: string | number
}

interface ItemProps extends IsSelected {
	item: InputItem
	isHighlighted: boolean | undefined
}

type StatusProps = PropsWithChildren<{
	hasMatch: boolean
	label?: string
}>

const StatusComponent = ({ hasMatch, children, label }: StatusProps) => (
	<Text>
		{`${label || "Query"}: `}
		<Text color={"#74BEFF"}>{children}</Text>
	</Text>
)

interface KeyPress {
	name: string
	sequence: string
	shift: boolean
}

export interface QuickSearchProps {
	onSelect: (item: InputItem) => void
	onHighlight?: (item: InputItem) => void
	items: InputItem[]
	label?: string
	focus?: boolean
	caseSensitive?: boolean
	limit?: number
	forceMatchingQuery?: boolean
	clearQueryChars?: string[]
	initialSelectionIndex?: number
	indicatorComponent?: FunctionComponent<IsSelected>
	itemComponent?: FunctionComponent<ItemProps>
	highlightComponent?: FunctionComponent
	statusComponent?: FunctionComponent<StatusProps>
}

// For the following four, whitespace is important
const IndicatorComponent = ({ isSelected }: IsSelected) => {
	return <Text color="#00FF00">{isSelected ? ">" : " "} </Text>
}

const ItemComponent = ({ isSelected, children }: IsSelected) => (
	<Text color={isSelected ? "#00FF00" : ""}>{children}</Text>
)

const HighlightComponent = ({ children }: { children: React.ReactNode }) => (
	<Text backgroundColor="#6C71C4" color="white">
		{children}
	</Text>
)

const defaultProps = {
	focus: true,
	caseSensitive: false,
	limit: 0,
	forceMatchingQuery: true,
	clearQueryChars: [
		"\u0015", // Ctrl + U
		"\u0017", // Ctrl + W
	],
	initialSelectionIndex: 0,
	indicatorComponent: IndicatorComponent,
	itemComponent: ItemComponent,
	highlightComponent: HighlightComponent,
	statusComponent: StatusComponent,
}

export function QuickSearch(props: QuickSearchProps) {
	const {
		items,
		onSelect,
		onHighlight,
		focus,
		clearQueryChars,
		limit,
		indicatorComponent,
		itemComponent,
		highlightComponent,
		statusComponent,
		label,
		forceMatchingQuery,
	} = Object.assign({}, defaultProps, props)

	// Map prop components onto capitalized names, required
	// for JSX to recognize em
	const Indicator = indicatorComponent
	const Item = itemComponent
	const Highlight = highlightComponent
	const Status = statusComponent

	const [windowIndices, setWindowIndices] = useState({
		selection: 0,
		start: 0,
	})
	const [query, setQuery] = useState("")

	const inkStdin = useStdin()

	useEffect(() => {
		keypress(inkStdin.stdin)

		if (inkStdin.isRawModeSupported) inkStdin.setRawMode(true)

		inkStdin.stdin.addListener("keypress", handleKeyPress)

		return () => {
			inkStdin.stdin.removeListener("keypress", handleKeyPress)
			if (inkStdin.isRawModeSupported) inkStdin.setRawMode(false)
		}
	}, [inkStdin, query, items, windowIndices])

	const itemRef = useRef(items)

	useEffect(() => {
		if (!isEqual(items, itemRef.current)) {
			itemRef.current = items

			setWindowIndices({
				selection: 0,
				start: 0,
			})

			setQuery("")
		}

		if (onHighlight) onHighlight(items[0]!)
	}, [items])

	const getMatchIndex = (label: string, query: string) => {
		return props.caseSensitive
			? label.indexOf(query)
			: label.toLowerCase().indexOf(query.toLowerCase())
	}

	const getMatchingItems = (alternateQuery?: string) => {
		const matchQuery = alternateQuery || query
		if (matchQuery === "") return items
		return items.filter((item) => getMatchIndex(item.label, matchQuery) >= 0)
	}

	const matchingItems = useMemo(() => {
		return getMatchingItems()
	}, [items, query])

	const usingLimitedView = limit !== 0 && matchingItems.length > limit

	const getValue = () => {
		return matchingItems[windowIndices.selection] || defaultValue
	}

	const removeCharFromQuery = () => {
		setQuery((query) => query.slice(0, -1) as string)
	}

	const addCharToQuery = (newChar: string) => {
		setQuery((query) => {
			let newQuery = query + newChar
			let newMatching = getMatchingItems(newQuery)
			if (newMatching.length === 0 && forceMatchingQuery) {
				return query
			} else {
				setWindowIndices({ start: 0, selection: 0 })
				return newQuery
			}
		})
	}

	const selectUp = () => {
		let newSelection

		setWindowIndices(({ selection, start }) => {
			newSelection = selection
			let newStart = start
			if (selection === 0) {
				// Wrap around to the bottom
				newSelection = matchingItems.length - 1
				if (usingLimitedView) {
					newStart = matchingItems.length - limit
				}
			} else {
				// Go up, potentially moving up window, unless
				// it is already 0.
				newSelection -= 1
				if (usingLimitedView) {
					if (selection - start <= 1 && start > 0) {
						newStart -= 1
					}
				}
			}

			return {
				selection: newSelection,
				start: newStart,
			}
		})

		if (onHighlight && newSelection) onHighlight(items[newSelection]!)
	}

	const selectDown = () => {
		let newSelection

		setWindowIndices(({ start, selection }) => {
			let newStart = start
			newSelection = selection
			if (selection === matchingItems.length - 1) {
				// Wrap around to the top
				newSelection = 0
				if (newStart !== 0) newStart = 0
			} else {
				// Go down, potentially moving window
				newSelection++
				if (
					limit &&
					matchingItems.length > limit &&
					newSelection - newStart >= limit - 1
				) {
					newStart += 1
				}
			}

			return {
				start: newStart,
				selection: newSelection,
			}
		})
	}

	const handleKeyPress = (ch: string, key: KeyPress) => {
		if (!focus) return
		if (!key && !Number.isNaN(ch)) {
			addCharToQuery(ch)
			return
		}
		if (clearQueryChars.indexOf(ch) !== -1) {
			setQuery("")
		} else if (key.name === "return") {
			onSelect(getValue())
		} else if (key.name === "backspace") {
			removeCharFromQuery()
		} else if (key.name === "up") {
			selectUp()
		} else if (key.name === "down") {
			selectDown()
		} else if (key.name === "tab") {
			if (key.shift === false) {
				selectDown()
			} else {
				selectUp()
			}
		} else if (hasAnsi(key.sequence)) {
			// Ignore fancy Ansi escape codes
		} else {
			addCharToQuery(ch)
		}
	}

	const begin = windowIndices.start
	let end = items.length
	if (limit !== 0) end = Math.min(begin + limit, items.length)
	const visibleItems = matchingItems.slice(begin, end)

	useEffect(() => {
		const selected = items.find(
			(item) => matchingItems.indexOf(item) === windowIndices.selection
		)
		if (onHighlight && selected) onHighlight(selected)
	}, [matchingItems, windowIndices.selection])

	return (
		<Box key="quicksearch-input" flexDirection="column">
			<Box key="status-label">
				<Status label={label} hasMatch={visibleItems.length > 0}>
					{query}
				</Status>
			</Box>

			{visibleItems.length === 0 ? (
				<Box key="no-items-found">No matches</Box>
			) : (
				visibleItems.map((item) => {
					const isSelected = matchingItems.indexOf(item) === windowIndices.selection
					const isHighlighted = true
					const itemProps: ItemProps = { isSelected, isHighlighted, item }
					const { label } = item

					const queryStart = getMatchIndex(label, query)
					const queryEnd = queryStart + query.length
					const preMatch = label.slice(0, queryStart)
					const match = label.slice(queryStart, queryEnd)
					const postMatch = label.slice(queryEnd)

					const labelComponent = (
						<Text>
							{preMatch}
							<Highlight>{match}</Highlight>
							{postMatch}
						</Text>
					)

					return (
						<Box flexDirection="row" key={`item-${label}`}>
							<Item {...itemProps}>
								<Indicator {...itemProps} />
								{labelComponent}
							</Item>
						</Box>
					)
				})
			)}

			{!usingLimitedView ? null : (
				<Box key="num-visible-items">
					<HighlightComponent>
						Viewing {begin}-{end} of {matchingItems.length} matching items ({items.length}{" "}
						items overall)
					</HighlightComponent>
				</Box>
			)}
		</Box>
	)
}
