import fs from "fs/promises"
import path from "path"

import { hasAnyToggles, loadEnabledRules } from "./kilo"

// kilocode_change start
let vscodeAPI: typeof import("vscode") | undefined
try {
	vscodeAPI = require("vscode")
} catch (e) {
	// In environments where 'vscode' is not available (like webview-ui build),
	// vscodeAPI will remain undefined. Notifications will not be shown.
	// This is acceptable as notifications are a progressive enhancement.
}

let hasShownNonKilocodeRulesMessage = false
// kilocode_change end

import { Dirent } from "fs"

import { isLanguage } from "@roo-code/types"

import { LANGUAGES } from "../../../shared/language"
import { ClineRulesToggles } from "../../../shared/cline-rules" // kilocode_change

/**
 * Safely read a file and return its trimmed content
 */
async function safeReadFile(filePath: string): Promise<string> {
	try {
		const content = await fs.readFile(filePath, "utf-8")
		return content.trim()
	} catch (err) {
		const errorCode = (err as NodeJS.ErrnoException).code
		if (!errorCode || !["ENOENT", "EISDIR"].includes(errorCode)) {
			throw err
		}
		return ""
	}
}

/**
 * Check if a directory exists
 */
async function directoryExists(dirPath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(dirPath)
		return stats.isDirectory()
	} catch (err) {
		return false
	}
}

const MAX_DEPTH = 5

/**
 * Recursively resolve directory entries and collect file paths
 */
async function resolveDirectoryEntry(
	entry: Dirent,
	dirPath: string,
	filePaths: string[],
	depth: number,
): Promise<void> {
	// Avoid cyclic symlinks
	if (depth > MAX_DEPTH) {
		return
	}

	const fullPath = path.resolve(entry.parentPath || dirPath, entry.name)
	if (entry.isFile()) {
		// Regular file
		filePaths.push(fullPath)
	} else if (entry.isSymbolicLink()) {
		// Await the resolution of the symbolic link
		await resolveSymLink(fullPath, filePaths, depth + 1)
	}
}

/**
 * Recursively resolve a symbolic link and collect file paths
 */
async function resolveSymLink(fullPath: string, filePaths: string[], depth: number): Promise<void> {
	// Avoid cyclic symlinks
	if (depth > MAX_DEPTH) {
		return
	}
	try {
		// Get the symlink target
		const linkTarget = await fs.readlink(fullPath)
		// Resolve the target path (relative to the symlink location)
		const resolvedTarget = path.resolve(path.dirname(fullPath), linkTarget)

		// Check if the target is a file
		const stats = await fs.stat(resolvedTarget)
		if (stats.isFile()) {
			filePaths.push(resolvedTarget)
		} else if (stats.isDirectory()) {
			const anotherEntries = await fs.readdir(resolvedTarget, { withFileTypes: true, recursive: true })
			// Collect promises for recursive calls within the directory
			const directoryPromises: Promise<void>[] = []
			for (const anotherEntry of anotherEntries) {
				directoryPromises.push(resolveDirectoryEntry(anotherEntry, resolvedTarget, filePaths, depth + 1))
			}
			// Wait for all entries in the resolved directory to be processed
			await Promise.all(directoryPromises)
		} else if (stats.isSymbolicLink()) {
			// Handle nested symlinks by awaiting the recursive call
			await resolveSymLink(resolvedTarget, filePaths, depth + 1)
		}
	} catch (err) {
		// Skip invalid symlinks
	}
}

/**
 * Read all text files from a directory in alphabetical order
 */
async function readTextFilesFromDirectory(dirPath: string): Promise<Array<{ filename: string; content: string }>> {
	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true, recursive: true })

		// Process all entries - regular files and symlinks that might point to files
		const filePaths: string[] = []
		// Collect promises for the initial resolution calls
		const initialPromises: Promise<void>[] = []

		for (const entry of entries) {
			initialPromises.push(resolveDirectoryEntry(entry, dirPath, filePaths, 0))
		}

		// Wait for all asynchronous operations (including recursive ones) to complete
		await Promise.all(initialPromises)

		const fileContents = await Promise.all(
			filePaths.map(async (file) => {
				try {
					// Check if it's a file (not a directory)
					const stats = await fs.stat(file)
					if (stats.isFile()) {
						const content = await safeReadFile(file)
						return { filename: file, content }
					}
					return null
				} catch (err) {
					return null
				}
			}),
		)

		// Filter out null values (directories or failed reads)
		return fileContents.filter((item): item is { filename: string; content: string } => item !== null)
	} catch (err) {
		return []
	}
}

/**
 * Format content from multiple files with filenames as headers
 */
function formatDirectoryContent(dirPath: string, files: Array<{ filename: string; content: string }>): string {
	if (files.length === 0) return ""

	return (
		"\n\n" +
		files
			.map((file) => {
				return `# Rules from ${file.filename}:\n${file.content}`
			})
			.join("\n\n")
	)
}

/**
 * Load rule files from the specified directory
 * kilocode_change: this function is only called when the user doesn't have any rules toggles stored yet
 */
export async function loadRuleFiles(cwd: string): Promise<string> {
	// kilocode_change start: add kilocode directory, leave fallback to roo directory
	// Check for .kilocode/rules/ directory
	const kilocodeRulesDir = path.join(cwd, ".kilocode", "rules")
	if (await directoryExists(kilocodeRulesDir)) {
		const files = await readTextFilesFromDirectory(kilocodeRulesDir)
		if (files.length > 0) {
			return formatDirectoryContent(kilocodeRulesDir, files)
		}
	}
	// kilocode_change end

	// Check for .roo/rules/ directory as fallback
	const rooRulesDir = path.join(cwd, ".roo", "rules")
	if (await directoryExists(rooRulesDir)) {
		const files = await readTextFilesFromDirectory(rooRulesDir)
		if (files.length > 0) {
			if (vscodeAPI && !hasShownNonKilocodeRulesMessage) {
				// kilocode_change: show message to move to .kilocode/rules/
				vscodeAPI.window.showWarningMessage(
					`Loading non-Kilocode rules from ${rooRulesDir}, consider moving to .kilocode/rules/`,
				)
				hasShownNonKilocodeRulesMessage = true
			} // kilocode_change end
			return formatDirectoryContent(rooRulesDir, files)
		}
	}

	// Fall back to existing behavior
	const ruleFiles = [".kilocoderules", ".roorules", ".clinerules"]

	for (const file of ruleFiles) {
		const content = await safeReadFile(path.join(cwd, file))
		if (content) {
			if (file !== ".kilocoderules" && vscodeAPI && !hasShownNonKilocodeRulesMessage) {
				// kilocode_change: show message to move to .kilocode/rules/
				vscodeAPI.window.showWarningMessage(
					`Loading non-Kilocode rules from ${file}, consider moving to .kilocode/rules/`,
				)
				hasShownNonKilocodeRulesMessage = true
			} // kilocode_change end
			return `\n# Rules from ${file}:\n${content}\n`
		}
	}

	return ""
}

export async function addCustomInstructions(
	modeCustomInstructions: string,
	globalCustomInstructions: string,
	cwd: string,
	mode: string,
	// kilocode_change begin: rule toggles
	options: {
		language?: string
		rooIgnoreInstructions?: string
		localRulesToggleState?: ClineRulesToggles
		globalRulesToggleState?: ClineRulesToggles
	} = {},
	// kilocode_change end
): Promise<string> {
	const sections = []

	// Load mode-specific rules if mode is provided
	let modeRuleContent = ""
	let usedRuleFile = ""

	if (mode) {
		// kilocode_change start: add kilocode directory, leave fallback to roo directory
		// Check for .kilocode/rules-${mode}/ directory
		const kilocodeModeRulesDir = path.join(cwd, ".kilocode", `rules-${mode}`)
		if (await directoryExists(kilocodeModeRulesDir)) {
			const files = await readTextFilesFromDirectory(kilocodeModeRulesDir)
			if (files.length > 0) {
				modeRuleContent = formatDirectoryContent(kilocodeModeRulesDir, files)
				usedRuleFile = kilocodeModeRulesDir
			}
		}
		// kilocode_change end

		// Check for .roo/rules-${mode}/ directory
		if (!modeRuleContent) {
			const rooModeRulesDir = path.join(cwd, ".roo", `rules-${mode}`)
			if (await directoryExists(rooModeRulesDir)) {
				const files = await readTextFilesFromDirectory(rooModeRulesDir)
				if (files.length > 0) {
					modeRuleContent = formatDirectoryContent(rooModeRulesDir, files)
					usedRuleFile = rooModeRulesDir
				}
			}
		}

		// If no directory exists, fall back to existing behavior
		if (!modeRuleContent) {
			const rooModeRuleFile = `.kilocoderules-${mode}`
			modeRuleContent = await safeReadFile(path.join(cwd, rooModeRuleFile))
			if (modeRuleContent) {
				usedRuleFile = rooModeRuleFile
			}
		}
	}

	// Add language preference if provided
	if (options.language) {
		const languageName = isLanguage(options.language) ? LANGUAGES[options.language] : options.language
		sections.push(
			`Language Preference:\nYou should always speak and think in the "${languageName}" (${options.language}) language unless the user gives you instructions below to do otherwise.`,
		)
	}

	// Add global instructions first
	if (typeof globalCustomInstructions === "string" && globalCustomInstructions.trim()) {
		sections.push(`Global Instructions:\n${globalCustomInstructions.trim()}`)
	}

	// Add mode-specific instructions after
	if (typeof modeCustomInstructions === "string" && modeCustomInstructions.trim()) {
		sections.push(`Mode-specific Instructions:\n${modeCustomInstructions.trim()}`)
	}

	// Add rules - include both mode-specific and generic rules if they exist
	const rules = []

	// Add mode-specific rules first if they exist
	if (modeRuleContent && modeRuleContent.trim()) {
		if (usedRuleFile.includes(path.join(".kilocode", `rules-${mode}`))) {
			rules.push(modeRuleContent.trim())
		} else {
			rules.push(`# Rules from ${usedRuleFile}:\n${modeRuleContent}`)
		}
	}

	if (options.rooIgnoreInstructions) {
		rules.push(options.rooIgnoreInstructions)
	}

	// kilocode_change start: rule toggles
	if (hasAnyToggles(options.localRulesToggleState) || hasAnyToggles(options.globalRulesToggleState)) {
		const genericRuleContent =
			(
				await loadEnabledRules(
					cwd,
					options.localRulesToggleState || {},
					options.globalRulesToggleState || {},
					directoryExists,
					readTextFilesFromDirectory,
				)
			)?.trim() ?? ""
		if (genericRuleContent) {
			rules.push(genericRuleContent)
		}
	} else {
		// Fallback to legacy function if no toggle states provided
		const genericRuleContent = (await loadRuleFiles(cwd))?.trim() ?? ""
		if (genericRuleContent) {
			rules.push(genericRuleContent)
		}
	}
	// kilocode_change end

	if (rules.length > 0) {
		sections.push(`Rules:\n\n${rules.join("\n\n")}`)
	}

	const joinedSections = sections.join("\n\n")

	return joinedSections
		? `
====

USER'S CUSTOM INSTRUCTIONS

The following additional instructions are provided by the user, and should be followed to the best of your ability without interfering with the TOOL USE guidelines.

${joinedSections}`
		: ""
}
