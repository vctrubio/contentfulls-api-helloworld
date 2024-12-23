const fs = require('fs').promises;
const contentful = require('contentful-management');
require('dotenv').config();
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const path = require('path');

const client = contentful.createClient({
    accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
});

async function parsePhotos(directoryPath) {
    try {
        const files = await fs.readdir(directoryPath);

        // Filter out template.txt and get only files (not directories)
        const photoFiles = files.filter(file =>
            file !== 'template.txt' &&
            !file.startsWith('.') // Exclude hidden files
        );

        // console.log(`Found ${photoFiles.length} photos in directory: ${directoryPath}`);
        return photoFiles;
    } catch (error) {
        console.error('Error parsing photos:', error);
        return [];
    }
}

async function parseTemplateFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fields = {};

        // Split content into lines and process each line
        const lines = content.split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                // Match content between '- ' and '-'
                const match = line.match(/^(.*?)-\s*(.*?)-$/);
                if (match) {
                    const fieldName = match[1].trim();
                    const fieldValue = match[2].trim();
                    fields[fieldName] = fieldValue;
                }
            }
        });
        // console.log('Parsed fields:', fields);
        return fields;
    } catch (error) {
        console.error('Error parsing template file:', error);
        return null;
    }
}

async function listContentTypes() {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        const contentTypes = await environment.getContentTypes();

        console.log('Available Content Types:');
        contentTypes.items.forEach(contentType => {
            console.log(`- ${contentType.name} (ID: ${contentType.sys.id})`);
        });

        return contentTypes.items;
    } catch (error) {
        console.error('Error in listContentTypes function:', error);
    }
}


async function getContentModelFields(contentTypeId) {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        const contentType = await environment.getContentType(contentTypeId);

        console.log(`Fields for Content Type: ${contentType.name}`);
        contentType.fields.forEach(field => {
            console.log(`- ${field.name} (${field.type})`);
        });

        return contentType.fields;
    } catch (error) {
        console.error('Error in getContentModelFields function:', error);
    }
}


async function getContentTypeFields(contentTypeId) {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        const contentType = await environment.getContentType(contentTypeId);

        console.log(`Fields for Content Type: ${contentType.name} (ID: ${contentTypeId})`);
        contentType.fields.forEach(field => {
            console.log(`- ${field.name} (${field.type})`);
        });

        return contentType.fields;
    } catch (error) {
        console.error('Error in getContentTypeFields function:', error);
        return null;
    }
}

async function checkApiEndpoint() {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);

        // Get the space details which includes the API information
        const spaceDetails = space.toPlainObject();

        console.log('Space ID:', spaceDetails.sys.id);
        console.log('Space Environment:', spaceDetails.sys.environment);
        console.log('API Type:', spaceDetails.sys.type);
        console.log('API Version:', spaceDetails.sys.version);

        // The Management API always uses api.contentful.com
        console.log('API Base URL: https://api.contentful.com');

        return 'https://api.contentful.com';
    } catch (error) {
        console.error('Error checking API endpoint:', error);
    }
}


async function helloWorld() {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');
        console.log('Hello World! Connected to Contentful space:', space.name);
        return space.name;
    } catch (error) {
        console.error('Error in helloWorld function:', error);
    }
}

async function fetchAllContent() {
    try {
        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        // Get all content types first
        const contentTypes = await environment.getContentTypes();

        // Store results for each content type
        const allContent = {};

        // Fetch entries for each content type
        for (const contentType of contentTypes.items) {
            console.log(`Fetching entries for content type: ${contentType.name}`);

            const entries = await environment.getEntries({
                content_type: contentType.sys.id
            });

            allContent[contentType.name] = {
                contentTypeId: contentType.sys.id,
                fields: contentType.fields.map(field => ({
                    id: field.id,
                    name: field.name,
                    type: field.type
                })),
                entries: entries.items.map(entry => ({
                    id: entry.sys.id,
                    fields: entry.fields
                }))
            };
        }

        console.log('Content types found:', Object.keys(allContent));
        return allContent;
    } catch (error) {
        console.error('Error fetching content:', error);
        throw error;
    }
}


async function deleteAllEntriesOfType(contentTypeName) {
    try {
        console.log(`Starting deletion of all ${contentTypeName} entries...`);

        const client = contentful.createClient({
            accessToken: process.env.CONTENTFUL_MANAGEMENT_TOKEN
        });

        const space = await client.getSpace(process.env.CONTENTFUL_SPACE_ID);
        const environment = await space.getEnvironment('master');

        // Fetch all entries of the specified content type
        const entries = await environment.getEntries({
            content_type: contentTypeName
        });

        console.log(`Found ${entries.items.length} entries to delete.`);

        // First unpublish all entries
        console.log('Unpublishing entries...');
        for (const entry of entries.items) {
            try {
                if (entry.isPublished()) {
                    await entry.unpublish();
                    console.log(`Unpublished entry: ${entry.sys.id}`);
                }
            } catch (error) {
                console.error(`Error unpublishing entry ${entry.sys.id}:`, error.message);
            }
        }

        // Then delete all entries
        console.log('Deleting entries...');
        for (const entry of entries.items) {
            try {
                await entry.delete();
                console.log(`Deleted entry: ${entry.sys.id}`);
            } catch (error) {
                console.error(`Error deleting entry ${entry.sys.id}:`, error.message);
            }
        }

        console.log(`Successfully deleted all ${contentTypeName} entries.`);
    } catch (error) {
        console.error(`Error deleting ${contentTypeName} entries:`, error);
        throw error;
    }
}

async function confirmDeletion(contentTypeName) {
    return new Promise((resolve) => {
        readline.question(
            `⚠️  WARNING: This will delete ALL entries of type "${contentTypeName}". This action cannot be undone!\n` +
            'Are you sure you want to proceed? (yes/no): ',
            (answer) => {
                readline.close();
                resolve(answer.toLowerCase() === 'yes');
            }
        );
    });
}
module.exports = { parseTemplateFile, listContentTypes, getContentModelFields, getContentTypeFields, helloWorld, parsePhotos, checkApiEndpoint, fetchAllContent, confirmDeletion, deleteAllEntriesOfType };