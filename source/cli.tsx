#!/usr/bin/env node
import Pastel from "pastel"

const app = new Pastel({
	importMeta: import.meta,
	name: "wtc",
	description: "WTC CLI",
})

await app.run()
