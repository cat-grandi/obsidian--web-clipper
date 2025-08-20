import browser from './browser-polyfill';
import { escapeDoubleQuotes, sanitizeFileName } from '../utils/string-utils';
import { Template, Property } from '../types/types';
import { generalSettings, incrementStat } from './storage-utils';
import { copyToClipboard } from './clipboard-utils';

export async function generateFrontmatter(properties: Property[], variables?: { [key: string]: string }): Promise<string> {
	// Expand auto-metadata properties before processing
	const expandedProperties = await expandAutoMetadataProperties(properties, variables || {});
	
	let frontmatter = '---\n';
	for (const property of expandedProperties) {
		// Wrap property name in quotes if it contains YAML-ambiguous characters
		const needsQuotes = /[:\s\{\}\[\],&*#?|<>=!%@\\-]/.test(property.name) || /^[\d]/.test(property.name) || /^(true|false|null|yes|no|on|off)$/i.test(property.name.trim());
		const propertyKey = needsQuotes ? (property.name.includes('"') ? `'${property.name.replace(/'/g, "''")}'` : `"${property.name}"`) : property.name;
		frontmatter += `${propertyKey}:`;

		const propertyType = generalSettings.propertyTypes.find(p => p.name === property.name)?.type || 'text';

		switch (propertyType) {
			case 'multitext':
				let items: string[];
				if (property.value.trim().startsWith('["') && property.value.trim().endsWith('"]')) {
					try {
						items = JSON.parse(property.value);
					} catch (e) {
						// If parsing fails, fall back to splitting by comma
						items = property.value.split(',').map(item => item.trim());
					}
				} else {
					// Split by comma, but keep wikilinks intact
					items = property.value.split(/,(?![^\[]*\]\])/).map(item => item.trim());
				}
				items = items.filter(item => item !== '');
				if (items.length > 0) {
					frontmatter += '\n';
					items.forEach(item => {
						frontmatter += `  - "${escapeDoubleQuotes(item)}"\n`;
					});
				} else {
					frontmatter += '\n';
				}
				break;
			case 'number':
				const numericValue = property.value.replace(/[^\d.-]/g, '');
				frontmatter += numericValue ? ` ${parseFloat(numericValue)}\n` : '\n';
				break;
			case 'checkbox':
				const isChecked = typeof property.value === 'boolean' ? property.value : property.value === 'true';
				frontmatter += ` ${isChecked}\n`;
				break;
			case 'date':
			case 'datetime':
				if (property.value.trim() !== '') {
					frontmatter += ` ${property.value}\n`;
				} else {
					frontmatter += '\n';
				}
				break;
			default: // Text
				frontmatter += property.value.trim() !== '' ? ` "${escapeDoubleQuotes(property.value)}"\n` : '\n';
		}
	}
	frontmatter += '---\n';

	// Check if the frontmatter is empty
	if (frontmatter.trim() === '---\n---') {
		return '';
	}

	return frontmatter;
}

function openObsidianUrl(url: string): void {
	browser.runtime.sendMessage({
		action: "openObsidianUrl",
		url: url
	}).catch((error) => {
		console.error('Error opening Obsidian URL via background script:', error);
		window.open(url, '_blank');
	});
}

async function tryClipboardWrite(fileContent: string, obsidianUrl: string): Promise<void> {
	const success = await copyToClipboard(fileContent);
	
	if (success) {
		obsidianUrl += `&clipboard`;
		openObsidianUrl(obsidianUrl);
		console.log('Obsidian URL:', obsidianUrl);
	} else {
		console.error('All clipboard methods failed, falling back to URI method');
		// Final fallback: use URI method with actual content (same as legacy mode)
		// Note: We don't add &clipboard here since we're bypassing the clipboard entirely
		obsidianUrl += `&content=${encodeURIComponent(fileContent)}`;
		openObsidianUrl(obsidianUrl);
		console.log('Obsidian URL (URI fallback):', obsidianUrl);
	}
}

export async function saveToObsidian(
	fileContent: string,
	noteName: string,
	path: string,
	vault: string,
	behavior: Template['behavior'],
): Promise<void> {
	let obsidianUrl: string;

	const isDailyNote = behavior === 'append-daily' || behavior === 'prepend-daily';

	if (isDailyNote) {
		obsidianUrl = `obsidian://daily?`;
	} else {
		// Ensure path ends with a slash
		if (path && !path.endsWith('/')) {
			path += '/';
		}

		const formattedNoteName = sanitizeFileName(noteName);
		obsidianUrl = `obsidian://new?file=${encodeURIComponent(path + formattedNoteName)}`;
	}

	if (behavior.startsWith('append')) {
		obsidianUrl += '&append=true';
	} else if (behavior.startsWith('prepend')) {
		obsidianUrl += '&prepend=true';
	} else if (behavior === 'overwrite') {
		obsidianUrl += '&overwrite=true';
	}

	const vaultParam = vault ? `&vault=${encodeURIComponent(vault)}` : '';
	obsidianUrl += vaultParam;

	// Add silent parameter if silentOpen is enabled
	if (generalSettings.silentOpen) {
		obsidianUrl += '&silent=true';
	}

	if (generalSettings.legacyMode) {
		// Use the URI method
		obsidianUrl += `&content=${encodeURIComponent(fileContent)}`;
		console.log('Obsidian URL:', obsidianUrl);
		openObsidianUrl(obsidianUrl);
	} else {
		// Try to copy to clipboard with fallback mechanisms
		await tryClipboardWrite(fileContent, obsidianUrl);
	}
}

async function expandAutoMetadataProperties(properties: Property[], variables: { [key: string]: string }): Promise<Property[]> {
	const expandedProperties: Property[] = [];
	
	for (const property of properties) {
		const propertyType = generalSettings.propertyTypes.find(p => p.name === property.name)?.type || property.type || 'text';
		
		if (propertyType === 'auto-metadata') {
			// Parse the configuration from the property value
			const config = parseAutoMetadataConfig(property.value);
			const autoProperties = generateAutoMetadataProperties(variables, config);
			expandedProperties.push(...autoProperties);
		} else {
			expandedProperties.push(property);
		}
	}
	
	return expandedProperties;
}

function parseAutoMetadataConfig(configString: string): { groupedOutput: boolean; groupKey: string; excludePatterns: string[]; excludeVariables: string[]; } {
	// Default configuration
	const defaultConfig = {
		groupedOutput: false,
		groupKey: 'metadata',
		excludePatterns: ['^content', '^fullHtml', '^contentHtml'],
		excludeVariables: ['content', 'contentHtml', 'fullHtml']
	};
	
	if (!configString || configString.trim() === '') {
		return defaultConfig;
	}
	
	try {
		// Try to parse as JSON configuration
		const parsed = JSON.parse(configString);
		return {
			groupedOutput: parsed.groupedOutput ?? defaultConfig.groupedOutput,
			groupKey: parsed.groupKey ?? defaultConfig.groupKey,
			excludePatterns: parsed.excludePatterns ?? defaultConfig.excludePatterns,
			excludeVariables: parsed.excludeVariables ?? defaultConfig.excludeVariables
		};
	} catch {
		// Fallback to simple string parsing for exclusion list
		const excludeList = configString.split(',').map(s => s.trim()).filter(s => s.length > 0);
		return {
			...defaultConfig,
			excludeVariables: [...defaultConfig.excludeVariables, ...excludeList]
		};
	}
}

function generateAutoMetadataProperties(variables: { [key: string]: string }, config: { groupedOutput: boolean; groupKey: string; excludePatterns: string[]; excludeVariables: string[]; }): Property[] {
	const filteredVariables: { [key: string]: string } = {};
	
	// Filter variables based on exclusion rules
	for (const [key, value] of Object.entries(variables)) {
		const cleanKey = key.replace(/^\{\{|\}\}$/g, ''); // Remove {{ and }}
		
		// Check if variable should be excluded
		const shouldExclude = config.excludeVariables.includes(cleanKey) ||
			config.excludePatterns.some(pattern => {
				try {
					return new RegExp(pattern).test(cleanKey);
				} catch {
					return cleanKey.includes(pattern);
				}
			});
		
		if (!shouldExclude && value && value.trim() !== '') {
			filteredVariables[cleanKey] = value;
		}
	}
	
	if (config.groupedOutput) {
		// Group all metadata under a single property
		return [{
			id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
			name: config.groupKey,
			value: JSON.stringify(filteredVariables),
			type: 'text'
		}];
	} else {
		// Create individual properties for each variable
		return Object.entries(filteredVariables).map(([key, value]) => ({
			id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
			name: key,
			value: value,
			type: 'text'
		}));
	}
}