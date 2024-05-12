import React from "react"
import { Text } from "ink"
import cfonts from "cfonts"

export function Header() {
	const header = cfonts.render("We The CLI", {
		font: "block",
		align: "left",
		gradient: ["#f9ea35", "#85de76", "#96daea", "#f36279"],
		backgroundColor: "transparent",
		letterSpacing: 1,
		lineHeight: 1,
		space: true,
		maxLength: 0,
		transitionGradient: true,
	})

	// @ts-ignore
	return <Text>{header.string}</Text>
}
