import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"
import { homedir } from "node:os"

interface Cache {
	onboard: boolean
}
const CACHE_NAME = "cache.json"
const CACHE_DIR = join(homedir(), ".cache", "homebrew-wtc")
const CACHE_PATH = join(CACHE_DIR, CACHE_NAME)
const DEFAULT_CACHE: Cache = {
	onboard: true,
}

let cacheData: Cache

export function getCache() {
	if (cacheData) return cacheData

	if (!existsSync(CACHE_PATH)) {
		initCache()
	} else {
		const data = readFileSync(CACHE_PATH)
		cacheData = JSON.parse(data.toString())
	}

	return cacheData
}

export function initCache() {
	mkdirSync(CACHE_DIR, { recursive: true })

	cacheData = DEFAULT_CACHE
	writeFileSync(CACHE_PATH, JSON.stringify(cacheData))
}
